import { src } from 'gulp'
import path from 'path'
import gulpIf from 'gulp-if'
import dartSass from 'sass'
import gulpSass from 'gulp-sass'
import rename from 'gulp-rename'
import multiDest from 'gulp-multi-dest'
import logger from 'gulp-logger'
import plumber from 'gulp-plumber'
import notify from 'gulp-notify'
import sourcemaps from 'gulp-sourcemaps'
import cssnano from 'cssnano'
import autoprefixer from 'autoprefixer'
import postcss from 'gulp-postcss'
import header from 'gulp-header';
import fs from 'fs';

import configLoader from '../helpers/config-loader'
import sassError from './sass-error'
import { env, themes, tempPath, projectPath, browserSyncInstances } from '../helpers/config'

export default function(name, file, storeName) {
  const theme = themes[name]
  const srcBase = path.join(tempPath, theme.dest)
  const stylesDir = theme.stylesDir ? theme.stylesDir : 'styles'
  const dest = []
  const disableMaps = env.disableMaps || false
  const production = env.prod || false
  const includePaths = theme.includePaths ? theme.includePaths : []
  const postcssConfig = []
  const disableSuffix = theme.disableSuffix || false
  const browserslist = configLoader('browserslist.json')
  const sassCompiler = configLoader('sass-compiler.json', false)

  // Set Sass compiler to Dart Sass
  if (sassCompiler === 'dart-sass') {
    gulpSass.compiler = dartSass
  }

  if (theme.postcss) {
    theme.postcss.forEach(el => {
      postcssConfig.push(eval(el))
    })
  }
  else {
    postcssConfig.push(autoprefixer({ overrideBrowserslist: browserslist }))
  }

  function adjustDestinationDirectory(file) {
    if (file.dirname.startsWith(stylesDir)) {
      file.dirname = file.dirname.replace(stylesDir, 'css')
    }
    else {
      file.dirname = file.dirname.replace('/' + stylesDir, '')
    }
    return file
  }

  let storeFile = null;
  let addHeader = false;
  let storeDestPath = '';
  if (storeName) {
    let storePath = path.join(projectPath, theme.src, stylesDir, 'stores', '_' + storeName + '.scss')
    if (fs.existsSync(storePath)) {
      storeFile = fs.readFileSync(storePath)
      addHeader = true;
      storeDestPath = path.join('stores', storeName);
    }
  }

  theme.locale.forEach(locale => {
    dest.push(path.join(projectPath, theme.dest, locale, storeDestPath))
  })

  const gulpTask = src( // eslint-disable-line one-var
    file || srcBase + '/**/*.scss',
    { base: srcBase }
  )
    .pipe(
      gulpIf(
        !env.ci,
        plumber({
          errorHandler: notify.onError('Error: <%= error.message %>')
        })
      )
    )
    .pipe(gulpIf(addHeader, header(storeFile)))
    .pipe(gulpIf(!disableMaps, sourcemaps.init()))
    .pipe(gulpSass({ includePaths: includePaths }).on('error', sassError(env.ci || false)))
    .pipe(gulpIf(production, postcss([cssnano()])))
    .pipe(gulpIf(postcssConfig.length, postcss(postcssConfig || [])))
    .pipe(gulpIf(production && !disableSuffix, rename({ suffix: '.min' })))
    .pipe(gulpIf(!disableMaps, sourcemaps.write('.', { includeContent: true })))
    .pipe(rename(adjustDestinationDirectory))
    .pipe(multiDest(dest))
    .pipe(logger({
      display   : 'name',
      beforeEach: 'Theme: ' + name + ' ',
      afterEach : ' Compiled!'
    }))

  if (browserSyncInstances) {
    Object.keys(browserSyncInstances).forEach(instanceKey => {
      const instance = browserSyncInstances[instanceKey]

      gulpTask.pipe(instance.stream())
    })
  }

  return gulpTask
}
