import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { buildConfig } from 'payload'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const baseConfig = {
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { 'en': adminLanguage },
  },
  collections: [Admins, Media, Folders, Tags],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
  figma: {},
}

const isFigmaEnvironment = Boolean(process.env.FIGMA || process.env.FIGMA_EID)

let config
if (isFigmaEnvironment) {
  try {
    config = buildFigmaConfig(baseConfig)
  } catch {
    config = buildConfig({
      ...baseConfig,
      secret: process.env.PAYLOAD_SECRET || 'academic-city-timetabling-secret-key-32-chars-min',
    })
  }
} else {
  config = buildConfig({
    ...baseConfig,
    secret: process.env.PAYLOAD_SECRET || 'academic-city-timetabling-secret-key-32-chars-min',
  })
}

export default config
