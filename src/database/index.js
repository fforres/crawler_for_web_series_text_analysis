import loki from 'lokijs';


export const createDB = () => {
  var db = new loki('series');
  return db;
}

export const createCollection = (name) => {
  return createDB()
    .addCollection(name);
}

export const saveData = (metadata, data) => {
  createCollection(metadata.name)
  console.log(require('util').inspect(metadata, { depth: null, colors:true }));
  console.log(require('util').inspect(data, { depth: null, colors:true }));

}
