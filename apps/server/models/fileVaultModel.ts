const mongo = require("mongoose")

const fileVault = mongo.Schema({
    vault_id: {
        type: mongo.Schema.Types.ObjectID,
        required: true,
        ref: "Vault"
    },
    filesLink: {
        type: String,
        required: true
    },
})

module.exports = mongo.model("Vault", fileVault)