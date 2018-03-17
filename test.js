
const {getModels} = require('node-car-api');

async function Brands(){
    const brands = await getModels("PEUGEOT");

    console.log(brands)
}
Brands()