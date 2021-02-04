import mergeStream from 'merge-stream'
import helper from '../helpers/scss'
import configLoader from '../helpers/config-loader'
import fs from 'fs';
import themes from '../helpers/get-themes'
import { projectPath } from '../helpers/config'

export const styles = () => {
  const streams = mergeStream()
  const themesData = configLoader('themes.json')

  themes().forEach(name => {
    let storePath = projectPath + themesData[name].src + '/styles/stores';
    if (fs.existsSync(storePath) && themesData[name].multipleStore) {
      fs.readdir(storePath, (err, files) => {
        files.forEach(file => {
          streams.add(helper(name, null, file.replace('_','').replace('.scss','')))
        });
      });
    } else {
      streams.add(helper(name))
    }

  })
  return streams
}
