"""Build the Ironbound item catalog from hand-picked Met Open Access objects.

Usage: python catalog.py <isnet.onnx> <candidates.json>

For each entry: download the original photo, cut it out, orient long horizontal pieces
upright (taller end up), export public/items/<slug>.webp and public/items/thumb/<slug>.webp,
and write src/data/items.json.
"""
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import cutout  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MET = os.path.join(ROOT, "assets-src", "met")
ORIG = os.path.join(MET, "orig")
CUT = os.path.join(MET, "cut")
PUB = os.path.join(ROOT, "public", "items")
THUMB = os.path.join(PUB, "thumb")
OUT_JSON = os.path.join(ROOT, "src", "data", "items.json")

# (objectID, name, category, value_usd, provenance 'a'|'f', maker or None, blurb)
E = [
    # Field relics: arrowheads, bits, spurs, stirrups
    (35800, "Bodkin Arrowhead", "fitting", 22, "a", None, "A narrow bodkin made to slip between the rings of mail."),
    (35798, "Leaf-Blade Arrowhead", "fitting", 24, "a", None, "Hand-forged leaf point. The hammer marks of its maker are still on it."),
    (35801, "Barbed Arrowhead", "fitting", 28, "a", None, "Barbs set back from the point so it would not pull free."),
    (35804, "Lanceolate Arrowhead", "fitting", 31, "a", None, "A slim, balanced head for long flights across open ground."),
    (717707, "Flint Arrowhead", "fitting", 34, "a", None, "Knapped about twelve thousand years ago. The oldest weapon in the armory."),
    (35799, "Broad Barbed Arrowhead", "fitting", 36, "a", None, "Wide barbs for hunting and war on the high plateau."),
    (35784, "War Arrowhead", "fitting", 40, "a", None, "Heavy enough to punch through a leather coat at forty paces."),
    (29360, "Iron Snaffle Bit", "fitting", 44, "a", None, "A rider's bit from the age of the first castles."),
    (35809, "Swallowtail Arrowhead", "fitting", 52, "a", None, "Forked tail and long tang, still bound in its old cord."),
    (35806, "Chisel Arrowhead, Shafted", "fitting", 58, "a", None, "A broad chisel head on its original wrapped shaft."),
    (35807, "Diamond Arrowhead, Shafted", "fitting", 64, "a", None, "A diamond point on its original shaft, binding intact."),
    (29334, "Ring Snaffle Bit", "fitting", 72, "a", None, "Twisted rings and a jointed mouthpiece, forged a thousand years ago."),
    (29245, "Openwork Spur", "fitting", 86, "a", None, "A dress spur with a pierced neck and a fine rowel."),
    (29197, "Prick Spur", "fitting", 140, "a", None, "A single sharp goad. Knights wore these before rowels existed."),
    (29620, "Knight's Prick Spur", "fitting", 180, "a", None, "Thirteenth-century spur with its strap loops still whole."),
    (32883, "Carolingian Spur", "fitting", 420, "a", None, "Worn in the empire of Charlemagne, cast and filed by hand."),
    (29247, "Parade Spur", "fitting", 690, "a", None, "Chiseled neck and a large rowel, made to be seen on parade."),
    (26546, "Viking Stirrup", "fitting", 1450, "a", None, "Tall iron stirrup from the late Viking age, with inlaid tread."),
    (29225, "Hungarian Spur", "fitting", 1600, "a", None, "A hussar's spur with a rowel as wide as a palm."),
    (29203, "Celtic Spur", "fitting", 1900, "a", None, "Cast bronze, two thousand years old. One of the earliest spurs known."),
    (754980, "Pair of Viking Stirrups", "fitting", 3800, "a", None, "A matched pair from Scandinavia, late tenth century."),
    (25610, "Bronze Age Axe Head", "axe", 1250, "a", None, "Cast bronze, around three thousand years old, green with age."),
    # Japanese sword fittings
    (30094, "Iron Tsuba", "fitting", 110, "a", None, "A plain iron guard, honest and heavy, from an Edo workshop."),
    (26295, "Openwork Iron Tsuba", "fitting", 130, "a", None, "Simple openings cut through dark iron. A soldier's guard."),
    (24780, "Leaf Openwork Tsuba", "fitting", 160, "a", None, "Leaves cut through the plate, sixteenth century."),
    (29995, "Beaded Ring Tsuba", "fitting", 240, "a", None, "A guard forged as a ring of iron beads around the blade."),
    (34759, "Hilt Collar, Gold Plum", "fitting", 300, "a", None, "Fuchi and kashira with plum blossoms in gold, made to frame a hilt."),
    (29976, "Chrysanthemum Tsuba", "fitting", 380, "a", None, "Chrysanthemums and vines in delicate iron openwork."),
    (34470, "Tsuba, Sage in the Waves", "fitting", 430, "a", None, "A sage walks the shore, carved in low relief."),
    (30089, "Tsuba with Golden Grapes", "fitting", 560, "a", None, "Gold grapes and vines on a lobed iron plate."),
    (24711, "Enamel Tsuba", "fitting", 650, "a", None, "Green enamel and gilt hearts on a cloud-shaped guard."),
    (30090, "Tsuba with Herons", "fitting", 720, "a", None, "Herons in silver wade through reeds on dark iron."),
    (34504, "Zodiac Tsuba", "fitting", 860, "a", None, "Copper guard set with medallions of the zodiac animals."),
    (24623, "Tsuba with Gold Bamboo", "fitting", 980, "a", None, "Gold bamboo on black. Made for a samurai of rank."),
    (24988, "Kozuka with Golden Crabs", "fitting", 1100, "a", None, "A knife handle with crabs in gold, from the late 1600s."),
    (642391, "Gilt Tsuba with Figures", "fitting", 1150, "a", None, "Figures and scrolls in gilt relief, eighteenth century."),
    (23404, "Pierced Arrowhead (Yano)", "fitting", 1350, "a", None, "A ceremonial arrowhead, pierced and dated 1645."),
    (34385, "Mother-of-Pearl Tsuba", "fitting", 1450, "a", None, "Blossoms in mother-of-pearl and gold scrolls on black lacquer."),
    (35133, "Kofun Iron Guard", "fitting", 1800, "a", None, "An iron guard from a burial mound, more than thirteen centuries old."),
    # Daggers
    (31283, "Sumatran Kris", "dagger", 680, "a", None, "A wavy blade whose watered steel was folded many times."),
    (31309, "Balinese Kris", "dagger", 1800, "a", None, "A gilded hilt above a blade with seven waves."),
    (21836, "Tantō in Bamboo Mount", "dagger", 1900, "a", None, "A short blade hidden in a mount carved to look like bamboo."),
    (25003, "Malay Kris with Gold Hilt", "dagger", 2300, "a", None, "Gold sheath fittings and a carved hilt, eighteenth century."),
    (21822, "Tantō in Lacquer Mount", "dagger", 2600, "a", None, "A sixteenth-century blade in black and gold lacquer."),
    (26564, "Deccan Dagger", "dagger", 2800, "a", None, "A curved blade under a dark animal-head hilt."),
    (31838, "Wavy-Bladed Deccan Dagger", "dagger", 3400, "a", None, "A serpent blade with an enameled hilt, Deccan court work."),
    (21869, "Tantō Blade", "dagger", 3800, "a", None, "A sixteenth-century tantō blade with a clean temper line."),
    (25032, "Jambiya with Gold Hilt", "dagger", 4600, "a", None, "A Persian curved dagger with a hilt sheathed in gold."),
    (21877, "Fifteenth-Century Tantō", "dagger", 5200, "a", None, "A tantō forged in the Muromachi period. Its signature tang is intact."),
    (31504, "Gold Katar", "dagger", 6900, "a", None, "A punch dagger with a gilt frame, Rajasthan, 1852."),
    (702011, "Horse-Head Khanjar", "dagger", 7800, "a", None, "An ivory hilt carved as a horse's head above a watered blade."),
    (31472, "Mughal Jade-Hilted Dagger", "dagger", 8900, "a", None, "Carved jade hilt from the Mughal court, eighteenth century."),
    (32684, "Late Gothic Dagger", "dagger", 9800, "a", None, "A French knight's dagger from the last years of the Middle Ages."),
    (24299, "Ottoman Gilded Dagger", "dagger", 11000, "a", None, "Gold on the blade and grip. Made for the Ottoman elite."),
    (31824, "Mughal Ram-Head Dagger", "dagger", 12500, "a", None, "A jade ram's head turns back toward the blade."),
    (32786, "Knight's Dagger", "dagger", 14500, "a", None, "English, around 1390. Carried beside the sword in battle."),
    # Swords
    (30908, "Indian Talwar", "sword", 2200, "a", None, "A curved cavalry blade with a disc pommel."),
    (679351, "Baltimore Officer's Saber", "sword", 3600, "a", None, "An American officer's saber, made in Baltimore around 1810."),
    (31719, "Gauntlet Sword (Pata)", "sword", 3900, "a", None, "The hand slides into a steel gauntlet, the blade becomes the arm."),
    (22631, "Gilded Smallsword", "sword", 8800, "a", None, "A Paris-hallmarked smallsword with its scabbard, made for court."),
    (32739, "Persian Saber with Scabbard", "sword", 9500, "a", None, "A deeply curved Persian blade in its black scabbard."),
    (23043, "Swept-Hilt Rapier", "sword", 9600, "a", None, "German, around 1605. A fencer's weapon with a cage of steel."),
    (27422, "German Rapier", "sword", 11800, "a", None, "A tall rapier from the late 1500s with a blackened hilt."),
    (27452, "Rapier with Spanish Blade", "sword", 12200, "a", None, "A Toledo-style blade under a pierced cup guard."),
    (33990, "Italian Rapier, 1580", "sword", 13400, "a", None, "Chiseled iron hilt, long thrusting blade, Italian work."),
    (21943, "Rapier with Pierced Guard", "sword", 14800, "a", None, "Early seventeenth-century Italian rapier, chiseled and pierced."),
    (25059, "Italian Rapier", "sword", 15500, "a", None, "A swept hilt in russet steel above a long blade."),
    (27907, "Swept-Hilt Sword", "sword", 16000, "a", None, "French, early sixteenth century. A transitional sword-rapier."),
    (31128, "Shamshir with Jeweled Scabbard", "sword", 16500, "a", None, "An Indian shamshir in a scabbard set with stones."),
    (31300, "Ottoman Kilij with Scabbard", "sword", 22000, "a", None, "A kilij with the flared tip that made Ottoman cavalry feared."),
    (24904, "Venetian Falchion", "sword", 24000, "a", None, "A broad single-edged blade with an etched ricasso, Venice, around 1490."),
    (33999, "Saber with Scabbard", "sword", 26000, "a", None, "Eastern European, around 1550. Gold-inlaid blade and grip."),
    (29626, "Italian Sword, 1500", "sword", 27000, "a", None, "An Italian sword with a gilded ricasso, made around 1500."),
    (25077, "Two-Handed Sword, Dated 1573", "sword", 34000, "a", None, "A German two-hander, dated on the blade. Taller than many men."),
    (27374, "Gilded Rapier", "sword", 36000, "a", None, "Gold over chiseled steel. An Italian nobleman's rapier from 1560."),
    (23367, "Arming Sword", "sword", 46000, "a", None, "Western Europe, around 1400. The sword of a knight at Agincourt's time."),
    (27458, "Knightly Longsword", "sword", 58000, "a", None, "A hand-and-a-half sword from around 1450, fit for the lists or the field."),
    (24832, "Viking Sword", "sword", 72000, "a", None, "Forged in the tenth century. Its lobed pommel marks a Norse warrior's blade."),
    (34806, "Carolingian Sword", "sword", 95000, "a", None, "Eighth century. A sword from the age of Charlemagne."),
    (24320, "Golden Saber of the Ottoman Court", "sword", 360000, "a", None, "Gold-covered and made in the reign of Süleyman the Magnificent."),
    # Japanese swords
    (21829, "Wakizashi in Red Lacquer", "sword", 6400, "a", None, "A short sword in a vermilion lacquer scabbard."),
    (34775, "Blade with Carved Horimono", "sword", 9200, "a", None, "A blade carved with a sacred motif near the tang."),
    (27601, "Katana Blade", "sword", 14000, "a", None, "An Edo-period blade with a bright, straight temper line."),
    (24630, "Daishō Pair", "sword", 18000, "a", None, "The long and short swords of a samurai, matched in black lacquer."),
    (27602, "Katana with Dragon Horimono", "sword", 22000, "a", None, "A dragon carved into the steel, picked out in red."),
    (27614, "Muromachi Katana Blade", "sword", 38000, "a", None, "Forged around 1500. A blade from Japan's age of war."),
    (22101, "Katana in Lacquered Mount", "sword", 48000, "a", None, "A sixteenth-century blade in a mount of silk and lacquer."),
    (24978, "Tachi Blade, Dated 1526", "sword", 65000, "a", None, "A signed and dated cavalry sword, made for a mounted samurai."),
    # Polearms and war hammers
    (29011, "German Halberd", "polearm", 1150, "a", None, "A guard's halberd from 1640, axe, spike and hook in one."),
    (25908, "Late Halberd", "polearm", 1350, "a", None, "German, late seventeenth century, with pierced crescent blades."),
    (25845, "Flemish Halberd", "polearm", 1700, "a", None, "A slender halberd from Flanders, around 1620."),
    (27026, "Halberd, Dated 1712", "polearm", 2400, "a", None, "A French halberd etched and dated on the blade."),
    (25093, "Brescian Glaive", "polearm", 3200, "a", None, "A long, curved blade from the armorers of Brescia."),
    (34306, "Guard's Partisan", "polearm", 3400, "a", None, "A British guard's partisan with gilt fittings and tassel."),
    (34321, "Colonial Halberd", "polearm", 3900, "a", None, "Made in America around 1760 for a sergeant's company."),
    (26777, "Italian Glaive", "polearm", 4800, "a", None, "A decorated glaive from about 1600, made for a palace guard."),
    (34089, "Saxon War Hammer", "axe", 5600, "a", None, "A horseman's hammer from Saxony, beak and face in one head."),
    (26090, "Italian Partisan", "polearm", 6200, "a", None, "Around 1500. A broad spearhead with gilt studs."),
    (33849, "Long War Hammer", "polearm", 8400, "a", None, "German, fifteenth century. Built to crack plate armor."),
    (25073, "Horseman's War Hammer", "axe", 16000, "a", None, "French, around 1450. The answer to a fully armored knight."),
    (25079, "French Pollaxe", "polearm", 19500, "a", None, "Axe, hammer and spike, the favorite weapon of knights on foot."),
    (33858, "Dragon-Head Ceremonial Hammer", "axe", 21000, "a", None, "A hammer head chiseled as a dragon, Italian, around 1550."),
    (26713, "Burgundian Pollaxe", "polearm", 28000, "a", None, "From the court of Burgundy, around 1470, with brass inlay."),
    # Axes and maces
    (30897, "Persian Saddle Axe", "axe", 1900, "a", None, "A rider's axe carried at the saddle, around 1740."),
    (694438, "Axe Head with Gold Inlay", "axe", 2600, "a", None, "A heavy axe head with gold scrolls, sixteenth century."),
    (29617, "Indo-Persian Mace", "axe", 2800, "a", None, "A gilded mace from the seventeenth century."),
    # Helmets
    (27119, "Bascinet, Revival Work", "helmet", 4800, "a", None, "A nineteenth-century armorer's tribute to a fourteenth-century helm."),
    (34119, "Bascinet Visor", "helmet", 6800, "a", None, "Italian, around 1440. The pointed visor of a knight's helm."),
    (26514, "Comb Morion", "helmet", 7200, "a", None, "A high-combed infantry helmet, German, around 1585."),
    (32137, "Deccan Helmet", "helmet", 8200, "a", None, "A seventeenth-century helmet with sliding nasal and plumes."),
    (26878, "Painted Morion", "helmet", 8600, "a", None, "Black and white paint over steel. A guard's helmet from 1600."),
    (24029, "Deccan Helmet with Mail", "helmet", 9400, "a", None, "A crown of steel with a curtain of mail, Deccan, 1600s."),
    (22058, "Kabuto", "helmet", 12000, "a", None, "A seventeenth-century samurai helmet with a lacquered neck guard."),
    (22247, "Etched Pointed Morion", "helmet", 12500, "a", None, "Brescia, around 1590, etched from brim to crest."),
    (26545, "Open Burgonet", "helmet", 14000, "a", None, "A German burgonet from about 1550, peak and cheeks intact."),
    (26450, "Etched Comb Morion", "helmet", 18000, "a", None, "Brunswick, around 1560. Etched with saints and scrolls."),
    (27587, "Dragon Kawari Kabuto", "helmet", 18000, "a", None, "A tall conical helmet painted with a dragon in gold."),
    (26437, "Gilt-Etched Morion", "helmet", 26000, "a", None, "Milanese, around 1590, with gilt bands on blackened steel."),
    (22513, "Suji Kabuto", "helmet", 26000, "a", None, "A ridged helmet of many plates, early seventeenth century."),
    (27847, "Kawari Kabuto", "helmet", 32000, "a", None, "A fantastic helmet shaped to make its wearer unforgettable."),
    (25384, "Etched Burgonet", "helmet", 34000, "a", None, "Gilt etching spirals over an Italian burgonet from 1560."),
    (34339, "Close Helmet", "helmet", 36000, "a", None, "German, around 1550. It closes completely around the head."),
    (24701, "Kettle Sallet", "helmet", 38000, "a", None, "A wide-brimmed sallet from Mühlau, around 1480."),
    (32057, "Mamluk Helmet with Aventail", "helmet", 38000, "a", None, "A tall helmet with its mail curtain, Egypt or Syria, around 1515."),
    (25391, "Milanese Sallet", "helmet", 42000, "a", None, "A deep sallet from the workshops of Milan, around 1475."),
    (26445, "Gothic Sallet", "helmet", 46000, "a", None, "Basel, around 1475. The swept tail of the late Gothic style."),
    (24790, "Hoshi Kabuto", "helmet", 48000, "a", None, "Gilt rivets and lacquer, a helmet for a samurai lord."),
    (26917, "Mongol Gilded Helmet", "helmet", 52000, "a", None, "Gold scrolls on a helmet from the age of the Khans."),
    (25388, "Gothic Sallet with Tail", "helmet", 54000, "a", None, "Nuremberg, around 1490. The silhouette of the knight in legend."),
    (27113, "Fluted Maximilian Armet", "helmet", 58000, "a", None, "Fluted steel in the style named for Emperor Maximilian."),
    (35890, "Etched Close Helmet", "helmet", 62000, "a", None, "Landshut, around 1560, banded with etching."),
    (23237, "Great Sallet", "helmet", 64000, "a", None, "An Italian helmet from the 1420s with a classical profile."),
    (23091, "Blued Gothic Sallet", "helmet", 68000, "a", None, "Landshut, around 1490, its steel heat-blued to a deep sheen."),
    (22774, "Milanese Armet", "helmet", 78000, "a", None, "The finest Italian knight's helm of the 1470s."),
    (22859, "Blued and Gilt Burgonet", "helmet", 88000, "a", None, "Augsburg, late 1500s. Blued steel with gold leafwork."),
    (23227, "Early Armet", "helmet", 96000, "a", None, "One of the earliest armets known, Italian, around 1435."),
    (26456, "Tournament Helm", "helmet", 120000, "a", None, "A jousting helm from about 1515. The slits face only forward."),
    (22158, "Suji Kabuto with Gilt Horns", "helmet", 140000, "a", None, "Gilt crests rise like horns from a ridged helmet, late 1400s."),
    (27115, "Triple-Crested Close Helmet", "helmet", 145000, "a", None, "Three crests and a fluted skull. German, around 1520."),
    (22885, "Parade Burgonet", "helmet", 160000, "a", None, "Embossed with figures, made in Augsburg for display."),
    (21986, "Visored Bascinet", "helmet", 240000, "a", None, "The pointed hounskull visor of a knight around 1390."),
    (26504, "Armet with Mask Visor", "helmet", 280000, "a", None, "Its visor is a grinning human face. Nuremberg, around 1520."),
    (26433, "Dolphin Burgonet all'Antica", "helmet", 380000, "a", None, "A sea creature forms the crest. Italian parade art, around 1540."),
    (21973, "Gilt Close Helmet", "helmet", 420000, "a", None, "French, around 1575, gilt and etched for a royal court."),
    (22903, "Embossed Close Helmet", "helmet", 650000, "a", None, "Milan, around 1540. Embossed relief over every surface."),
    # Shields
    (31798, "Afghan Rattan Shield", "shield", 1900, "a", None, "Woven rattan with four bosses, light and tough."),
    (26813, "Painted Indian Dhal", "shield", 3400, "a", None, "A round shield with painted gold and four bosses."),
    (27220, "Fist Shield", "shield", 9800, "a", None, "An Italian buckler held in the fist, sixteenth century."),
    (684911, "Indian Dhal with Gold Bosses", "shield", 11000, "a", None, "A seventeenth-century shield with gold and enamel bosses."),
    (34127, "Gauntlet Shield", "shield", 24000, "a", None, "A shield worn on the left hand for night fighting, around 1600."),
    (27942, "Welsh Targe", "shield", 28000, "a", None, "A round shield made in Wrexham around 1500."),
    (24897, "Blued Italian Shield", "shield", 36000, "a", None, "Blued steel with gilt stars, Italian, around 1560."),
    (27237, "Etched Rotella", "shield", 48000, "a", None, "An Italian round shield etched in radiating bands."),
    (34123, "Augsburg Etched Shield", "shield", 64000, "a", None, "Etched in Augsburg around 1550 with trophies and scrolls."),
    (24700, "Gilded Rotella", "shield", 72000, "a", None, "A gold-washed round shield from around 1600."),
    (25415, "Etched Parade Shield", "shield", 210000, "a", None, "Landshut, around 1560. Gilt etching of beasts and heraldry."),
    # Armor
    (31950, "Ottoman Mail Gauntlet", "armor", 4200, "a", None, "Riveted mail on a leather cuff, seventeenth century."),
    (22348, "Etched Left Gauntlet", "armor", 18000, "a", None, "A fingered gauntlet etched in Spain around 1560."),
    (22344, "Blued Gauntlet", "armor", 22000, "a", None, "Blued and gilt steel for a German nobleman."),
    (23263, "Mitten Gauntlet", "armor", 24000, "a", None, "Milan, late 1400s. Plates move like the fingers they cover."),
    (22317, "Etched Breastplate", "armor", 26000, "a", None, "Nuremberg, around 1550, etched down the center."),
    (23040, "Fluted Breastplate", "armor", 34000, "a", None, "Innsbruck, around 1510, with fan fluting."),
    (934509, "Right Gauntlet", "armor", 38000, "a", None, "Brescia, around 1460, one of very few that survive."),
    (24645, "Locking Gauntlet", "armor", 48000, "a", None, "It locks shut around the sword grip. Augsburg, around 1540."),
    (23255, "Gilt Gauntlet", "armor", 56000, "a", None, "Gold over steel from Milan, around 1555."),
    (24796, "Gothic Breastplate", "armor", 62000, "a", None, "German, around 1480. The ridged plate of the late Gothic knight."),
    (23145, "Kastenbrust Breastplate", "armor", 88000, "a", None, "The boxed breastplate of the 1440s, rare to find whole."),
    (25588, "Samurai Armor (Gusoku)", "armor", 95000, "a", None, "A complete samurai armor, helmet to greaves."),
    (22408, "Embossed Milanese Breastplate", "armor", 140000, "a", None, "Embossed figures and scrolls, Milan, around 1540."),
    (23090, "Half Armor", "armor", 190000, "a", None, "Augsburg, around 1515. Breast, back and arms for a mounted officer."),
    (22274, "Augsburg Field Armor", "armor", 1200000, "a", None, "A complete armor from Augsburg, about 1545. A grail of the armory."),
    # Crossbows
    (25600, "Crossbow with Cranequin", "crossbow", 18000, "a", None, "A hunting crossbow spanned by a geared cranequin."),
    (34790, "Crossbow", "crossbow", 26000, "a", None, "German, possibly fifteenth century, steel bow and wooden tiller."),
    (33738, "Central European Crossbow", "crossbow", 42000, "a", None, "Late fifteenth century, with bone inlay along the tiller."),
    (23336, "Gilded Crossbow", "crossbow", 68000, "a", None, "Central Europe, around 1450, decorated in gold."),
]

ORIGIN = {
    "western european": "Western Europe", "european": "Europe", "north european": "Northern Europe", "eastern european": "Eastern Europe",
    "central european": "Central Europe", "italian": "Italy", "german": "Germany", "french": "France", "spanish": "Spain", "british": "Britain",
    "english": "England", "austrian": "Austria", "japanese": "Japan", "indian": "India", "turkish": "Turkey", "iranian": "Iran", "persian": "Persia",
    "chinese": "China", "tibetan": "Tibet", "mongolian": "Mongolia", "flemish": "Flanders", "dutch": "Netherlands", "hungarian": "Hungary",
    "scandinavian": "Scandinavia", "celtic": "Celtic Europe", "carolingian": "Frankish Empire", "javanese": "Java", "balinese": "Bali",
    "sumatran": "Sumatra", "malayan": "Malaya", "philippine": "Philippines", "afghan": "Afghanistan", "egyptian": "Egypt", "syrian": "Syria",
    "caucasian": "Caucasus", "thai": "Thailand", "american": "United States", "anglo-flemish": "England or Flanders", "indo-persian": "Indo-Persia",
    "germanic": "Germanic Europe", "greek": "Greece",
}

OVERRIDE_ORIGIN = {
    31824: "Mughal India", 31472: "Mughal India", 31504: "Rajasthan, India", 26564: "Deccan, India", 31838: "Deccan, India",
    32137: "Deccan, India", 24029: "Deccan, India", 26917: "Mongolia or China", 32057: "Egypt or Syria", 24320: "Ottoman Turkey",
    31300: "Ottoman Turkey", 24299: "Ottoman Turkey", 31128: "India", 717707: "Italy", 27119: "Germany", 33999: "Eastern Europe",
    34306: "Britain", 679351: "Baltimore, United States", 34321: "United States", 21986: "Western Europe",
}


def origin_from(culture, oid):
    if oid in OVERRIDE_ORIGIN:
        return OVERRIDE_ORIGIN[oid]
    c = (culture or "").strip()
    c = re.sub(r"^(probably|possibly)\s+", "", c, flags=re.I)
    parts = [p.strip() for p in c.split(",")]
    nat = ORIGIN.get(parts[0].lower(), parts[0])
    if len(parts) > 1 and parts[1] and not parts[1].lower().startswith(("probably", "possibly", "hilt", "blade", "grip", "mount")):
        return f"{parts[1]}, {nat}"
    return nat or "Unknown"


def era_from(date):
    d = re.sub(r"\s+", " ", (date or "").strip())
    d = re.sub(r"^ca\.\s*", "c. ", d, flags=re.I)
    d = re.sub(r"\bca\.\s*", "c. ", d)
    if d and not d.startswith("c. "):
        d = d[0].upper() + d[1:]
    return d


def length_weight(dim):
    dim = dim or ""
    length = None
    m = re.search(r"(?:L\.|Length|H\.|Height|Diam\.)[^;(]*\(([\d.]+)\s*cm\)", dim)
    if m:
        length = f"{float(m.group(1)):.0f} cm"
    weight = None
    kg = None
    # Prefer the metric figure given with the weight itself; a length can be mistyped in grams.
    m = re.search(r"Wt\.[^;]*?\(([\d.,]+)\s*(kg|g)\)", dim)
    if m:
        kg = float(m.group(1).replace(",", "")) / (1 if m.group(2) == "kg" else 1000)
    else:
        m = re.search(r"\(([\d.,]+)\s*g\)", dim)
        if m:
            kg = float(m.group(1).replace(",", "")) / 1000
        else:
            m = re.search(r"\(([\d.]+)\s*kg\)", dim)
            if m:
                kg = float(m.group(1))
    # The metric figure is sometimes mistyped (kg written for g); the pounds and ounces
    # given beside it settle which one is right.
    imp = re.search(r"Wt\.\s*(?:([\d.]+)\s*lbs?\.?)?\s*(?:([\d.]+)\s*oz\.?)?", dim)
    if kg and imp and (imp.group(1) or imp.group(2)):
        lb_kg = float(imp.group(1) or 0) * 0.45359237 + float(imp.group(2) or 0) * 0.028349523
        if lb_kg > 0 and not (1 / 3 < kg / lb_kg < 3):
            kg = lb_kg
    if kg:
        weight = f"{kg:.1f} kg" if kg >= 1 else f"{kg * 1000:.0f} g"
    return length, weight


def materials_from(medium):
    m = (medium or "").strip().rstrip(".")
    return m[:80] if m else "Steel"


def slugify(name, oid):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("ō", "o").replace("ü", "u")).strip("-")
    return f"{s}-{oid}"


def download(meta):
    oid = meta["objectID"]
    path = os.path.join(ORIG, f"{oid}.jpg")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return path
    url = urllib.parse.quote(meta["primaryImage"], safe=":/%")
    req = urllib.request.Request(url, headers={"User-Agent": "ironbound-mock-asset-harvest/1.1"})
    with urllib.request.urlopen(req, timeout=90) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


# Loose heads look right lying flat; only hafted or bladed pieces stand up.
NO_ROTATE = {25610, 694438, 30897, 29617}


def orientation(rgba, category, oid=0):
    """Degrees (CSS, clockwise) to stand a long horizontal piece upright, taller end on top."""
    if oid in NO_ROTATE:
        return 0
    a = np.asarray(rgba)[..., 3] > 40
    h, w = a.shape
    if w / max(h, 1) < 1.8 or category not in ("sword", "dagger", "polearm", "axe"):
        return 0
    k = max(2, int(w * 0.18))

    def extent(cols):
        rows = np.where(cols.any(axis=1))[0]
        return (rows.max() - rows.min()) if len(rows) else 0

    left, right = extent(a[:, :k]), extent(a[:, -k:])
    return 90 if left >= right else -90


# Kabuto photographed on a pale wooden cross stand.
STAND_IDS = {27587}


def strip_post(rgba):
    """Removes a wooden cross stand from a kabuto photo. Below the first narrow neck under the
    helmet only the stand remains, so those rows are cleared. Above it the post stands in
    front of the neck guard: its columns are cleared up to where it meets the brim, and the
    metal on either side is kept."""
    a = np.asarray(rgba).copy()
    h, w = a.shape[:2]
    alpha = a[..., 3] > 40
    widths = alpha.sum(axis=1)
    if widths.max() == 0:
        return rgba
    rgb = a[..., :3].astype(np.int16)
    run = max(4, h // 50)
    narrow = (widths > 0) & (widths < widths.max() * 0.22)
    cut = next((y for y in range(h // 2, h - run) if narrow[y:y + run].all()), None)
    if cut is None or h - cut < h * 0.05:
        return rgba
    rows = slice(cut, cut + run)
    # The post's columns: the longest run that stays opaque through the neck rows.
    solid = alpha[rows].mean(axis=0) > 0.8
    best, x = (0, -1), 0
    while x < w:
        if solid[x]:
            end = x
            while end + 1 < w and solid[end + 1]:
                end += 1
            if end - x > best[1] - best[0]:
                best = (x, end)
            x = end + 1
        else:
            x += 1
    if best[1] - best[0] < 4:
        return rgba
    x0, x1 = best[0], best[1] + 1
    # Follow the post up to the brim. The wood darkens gradually with shade; the brim's
    # lacquered underside is a sharply dark row, which is where the post ends.
    top = cut
    for y in range(cut - 1, max(0, cut - int(h * 0.35)), -1):
        seg = rgb[y, x0:x1]
        lum = (0.299 * seg[:, 0] + 0.587 * seg[:, 1] + 0.114 * seg[:, 2]) / 255
        if np.median(lum) < 0.25:
            break
        top = y
    a[cut:, :, 3] = 0
    a[top:cut, max(0, x0 - 2):min(w, x1 + 2), 3] = 0
    im = Image.fromarray(a, "RGBA")
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def strip_stand(rgba):
    """Removes a museum display pole under a helmet: thin rows at the bottom are cleared."""
    a = np.asarray(rgba).copy()
    alpha = a[..., 3] > 40
    widths = alpha.sum(axis=1)
    if widths.max() == 0:
        return rgba
    limit = widths.max() * 0.12
    y = len(widths) - 1
    while y > 0 and widths[y] < limit:
        y -= 1
    if y < len(widths) - 1 and (len(widths) - 1 - y) > len(widths) * 0.03:
        a[y + 1:, :, 3] = 0
        im = Image.fromarray(a, "RGBA")
        bbox = im.getbbox()
        return im.crop(bbox) if bbox else im
    return rgba


def main():
    model, cand_path = sys.argv[1], sys.argv[2]
    for d in (ORIG, CUT, PUB, THUMB):
        os.makedirs(d, exist_ok=True)
    cands = {c["objectID"]: c for c in json.load(io.open(cand_path, encoding="utf-8"))}
    allmeta = {o["objectID"]: o for o in json.load(io.open(os.path.join(MET, "objects.json"), encoding="utf-8"))}
    metas = []
    for e in E:
        meta = cands.get(e[0]) or allmeta.get(e[0])
        if not meta:
            print("MISSING META", e[0], e[1])
            continue
        metas.append((e, meta))

    with ThreadPoolExecutor(max_workers=4) as pool:
        for (e, _), res in zip(metas, pool.map(lambda em: _safe_dl(em[1]), metas)):
            if not res:
                print("DOWNLOAD FAILED", e[0], e[1])

    sess = cutout.load_session(model)
    items = []
    for e, meta in metas:
        oid, name, cat, value, prov, maker, blurb = e
        src = os.path.join(ORIG, f"{oid}.jpg")
        if not os.path.exists(src):
            continue
        cut_path = os.path.join(CUT, f"{oid}.png")
        if not os.path.exists(cut_path):
            img = Image.open(src).convert("RGB")
            img.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
            tmp = os.path.join(CUT, f"{oid}.src.jpg")
            img.save(tmp, quality=95)
            ok = cutout.process(sess, tmp, cut_path)
            os.remove(tmp)
            if not ok:
                print("EMPTY CUTOUT", oid, name)
                continue
        rgba = Image.open(cut_path).convert("RGBA")
        if cat in ("helmet", "armor"):
            rgba = strip_stand(rgba)
        if oid in STAND_IDS:
            rgba = strip_post(rgba)
        rot = orientation(rgba, cat, oid)
        if rot:
            # Bake the rotation in, so every consumer gets an upright image. PIL rotates counter-clockwise.
            rgba = rgba.rotate(-rot, expand=True, resample=Image.Resampling.BICUBIC)
        slug = slugify(name, oid)
        full = rgba.copy()
        full.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
        full.save(os.path.join(PUB, f"{slug}.webp"), "WEBP", quality=85, method=4)
        th = rgba.copy()
        th.thumbnail((440, 440), Image.Resampling.LANCZOS)
        th.save(os.path.join(THUMB, f"{slug}.webp"), "WEBP", quality=80, method=4)
        length, weight = length_weight(meta.get("dimensions"))
        item = {
            "id": slug,
            "name": name,
            "category": cat,
            "era": era_from(meta.get("objectDate")),
            "origin": origin_from(meta.get("culture"), oid),
            "provenance": "antique" if prov == "a" else "forged",
            "materials": materials_from(meta.get("medium")),
            "value": value,
            "blurb": blurb,
            "image": f"/items/{slug}.webp",
            "thumb": f"/items/thumb/{slug}.webp",
            "aspect": round(full.width / full.height, 4),
            "credit": "The Metropolitan Museum of Art, Open Access (CC0)",
            "sourceUrl": meta.get("objectURL") or "",
        }
        if prov == "f":
            item["maker"] = maker
            item["era"] = "Made 2025"
            item["origin"] = maker.split(", ")[-1]
            item["materials"] = "Hand-forged steel" if cat != "dagger" else "Folded steel, wood, silk"
        if length:
            item["length"] = length
        if weight:
            item["weight"] = weight
        items.append(item)
        print(f"{oid:>7} {rot:>4} {item['aspect']:>6} {slug}", flush=True)

    items.sort(key=lambda i: i["value"])
    with io.open(OUT_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(items, f, ensure_ascii=False, indent=1)
    print("items", len(items))


def _safe_dl(meta):
    try:
        return download(meta)
    except Exception as ex:  # noqa: BLE001
        print("dl error", meta.get("objectID"), ex, flush=True)
        return None


if __name__ == "__main__":
    main()
