//L'application requiert l'utilisation du module Express.
//La variable express nous permettra d'utiliser les fonctionnalités du module Express.  
var express = require('express');
var client = require('./connection.js');
const { getBrands } = require('node-car-api');
const { getModels } = require('node-car-api');
const pSettle = require('p-settle');
// Nous définissons ici les paramètres du serveur.
var hostname = 'localhost';
var port = 9292;

var app = express();
var router = express.Router();  // get an instance of the express Router

function Brands() {
    return new Promise((resolve,reject)=>{
        getBrands()
        .then((brands)=>{
            return resolve(brands);
        })
        .catch((err)=>{return resolve("ERR")})
    })
}

function Models(brand) {
    return new Promise((resolve,reject)=>{
        getModels(brand)
        .then((models)=>{resolve(models)})
        .catch((err) => {resolve("ERR")})
    })
}

/**
 * Index all the data from node-car-api to elasticSearch
 */
app.route("/populate") //Instancie la route
    .get(function (req, res) { //Pour un get
        //Brands()
            //.then(brands => {
                var brandd = ["PEUGEOT","DACIA"];
                const requests = brandd.map(brand => Models(brand))
                Promise.all(requests)
                    .then(results => {
                        console.log(results[0])
                        var models = [].concat.apply([], results)
                        var bulk_body = [];
                        models.forEach(model => {
                            if (model != "ERR") {
                                bulk_body.push({ index: { _index: 'cars', _type: 'car', _id: model.uuid } })
                                bulk_body.push(model)
                            }
                        });
                        console.log(bulk_body);
                        client.bulk({
                            body: bulk_body
                        }, (err, resp) => {
                            if (err) res.send(err)
                            else {
                                client.indices.putMapping({
                                    index: "cars",
                                    type: "car",
                                    body: {
                                        "properties": {
                                            "volume": {
                                                "type": "text",
                                                "fielddata": true
                                            }
                                        }
                                    }
                                }).then((result) => {
                                    res.send(resp);
                                })
                                    .catch((err) => {
                                        console.log(err)
                                        res.send(err)
                                    })

                            }
                        })
                    })
                    .catch(err => {
                        console.log("Error in promise all")
                        console.log(err)
                    })
           // .catch((err) => { console.log("Error in Brands") })
    })


app.route("/suv")
    .get(function (req, res) {
        var query = {
            "sort": [
                {
                    "volume": { "order": "desc" }
                }
            ]
        }

        client.search({
            index: "cars",
            type: "car",
            body: query
        }, (err, resp) => {
            res.send(resp)
        });
    })

// Démarrer le serveur 
app.listen(port, hostname, function () {
    console.log("Mon serveur fonctionne sur http://" + hostname + ":" + port + "\n");
});