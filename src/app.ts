import express from 'express'

import { registerRouteMethods } from './register.ts'
import type { App } from './types/route.ts'

export function createApp() {
  return registerRouteMethods(express()) as unknown as App
}
