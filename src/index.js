import { start } from './crawler';
import { baseUrl, series } from './data';
import { saveData } from './database';

series
  .forEach(el => {
    start(`${baseUrl}${el.id}`)
      .then(data => {
        saveData(el, data)
      })
  })
