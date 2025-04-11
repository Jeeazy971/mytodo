/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

function DB(credentials) {
    // Si on est sur Scalingo, extrait automatiquement le nom de la base à partir de la chaîne de connexion.
    const getDbName = () => {
        if (process.env.SCALINGO_MONGO_URL) {
            // La chaîne ressemble à : mongodb://user:pass@host:port/database?...
            const withoutOptions = process.env.SCALINGO_MONGO_URL.split('?')[0];
            return withoutOptions.substring(withoutOptions.lastIndexOf('/') + 1);
        }
        return 'todos';
    };

    const DB_NAME = getDbName();
    const COLLECTION_NAME = 'todos';
    const self = this;
    let db;

    self.type = function () {
        return 'MongoDB';
    };

    self.init = () => {
        return new Promise((resolve, reject) => {
            let mongoUrl;

            // Priorité à la variable Scalingo
            if (process.env.SCALINGO_MONGO_URL) {
                mongoUrl = process.env.SCALINGO_MONGO_URL;
            }
            // Sinon, vérification d'une URI globale
            else if (credentials.MONGO_URI) {
                mongoUrl = credentials.MONGO_URI;
            }
            // Sinon, construction avec des credentials individuels (ancienne méthode)
            else if (
                credentials.MONGO_USERNAME &&
                credentials.MONGO_PASSWORD &&
                credentials.MONGO_HOSTS
            ) {
                let username = credentials.MONGO_USERNAME;
                let password = credentials.MONGO_PASSWORD;
                let connectionPath = credentials.MONGO_HOSTS;
                mongoUrl = `mongodb://${username}:${password}@${connectionPath}/?replicaSet=replset`;
            } else {
                return reject('❌ Aucune chaîne de connexion MongoDB trouvée.');
            }

            // Options communes pour se connecter
            let options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            };

            // Si un certificat est fourni (ancienne méthode), l'ajouter aux options
            if (credentials.MONGO_CERTIFICATE_BASE64) {
                options.ssl = true;
                options.sslValidate = true;
                options.sslCA = [
                    Buffer.from(credentials.MONGO_CERTIFICATE_BASE64, 'base64'),
                ];
            }

            MongoClient.connect(mongoUrl, options, (err, client) => {
                if (err) {
                    console.error('Erreur de connexion MongoDB:', err);
                    reject(err);
                } else {
                    // On se connecte sur la base dont le nom est déterminé
                    db = client.db(DB_NAME).collection(COLLECTION_NAME);
                    console.log('✅ Connexion à MongoDB réussie sur la base:', DB_NAME);
                    resolve();
                }
            });
        });
    };

    self.count = () => {
        return new Promise((resolve, reject) => {
            db.countDocuments((err, count) => {
                if (err) reject(err);
                else resolve(count);
            });
        });
    };

    self.search = () => {
        return new Promise((resolve, reject) => {
            db.find().toArray((err, result) => {
                if (err) reject(err);
                else {
                    resolve(
                        result.map((todo) => {
                            todo.id = todo._id;
                            delete todo._id;
                            return todo;
                        }),
                    );
                }
            });
        });
    };

    self.create = (item) => {
        return new Promise((resolve, reject) => {
            db.insertOne(item, (err, result) => {
                if (err) reject(err);
                else {
                    const newItem = Object.assign({ id: result.ops[0]._id }, item);
                    resolve(newItem);
                }
            });
        });
    };

    self.read = (id) => {
        return new Promise((resolve, reject) => {
            db.findOne({ _id: new mongodb.ObjectID(id) }, (err, item) => {
                if (err) reject(err);
                else {
                    item.id = item._id;
                    delete item._id;
                    resolve(item);
                }
            });
        });
    };

    self.update = (id, newValue) => {
        return new Promise((resolve, reject) => {
            delete newValue.id;
            db.findOneAndUpdate(
                { _id: new mongodb.ObjectID(id) },
                { $set: newValue },
                { returnOriginal: false },
                (err, result) => {
                    if (err) reject(err);
                    else {
                        const updatedItem = result.value;
                        updatedItem.id = updatedItem._id;
                        delete updatedItem._id;
                        resolve(updatedItem);
                    }
                },
            );
        });
    };

    self.delete = (id) => {
        return new Promise((resolve, reject) => {
            db.deleteOne({ _id: new mongodb.ObjectID(id) }, (err, result) => {
                if (err) reject(err);
                else resolve({ id });
            });
        });
    };
}

module.exports = function (credentials) {
    return new DB(credentials);
};
