import { Component, type ReactNode } from 'react'

/**
 * Keeps a failed part of the scene from taking the rest with it: a texture that cannot load
 * removes its own part (or shows the fallback) while the chest, the piece and the camera go on.
 */
export class Quiet extends Component<{ fallback?: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
