import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const demoDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(demoDirectory, '..')

const nextConfig: NextConfig = {
  turbopack: {
    root: repositoryRoot,
  },
  outputFileTracingRoot: repositoryRoot,
}

export default nextConfig
