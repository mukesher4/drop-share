const mongo = require("mongoose")

const vaultSchema = mongo.Schema({
    vaultCode: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: false
    },
    filesLink: {
        type: String,
        required: true
    },
    duration: {
        type: Date,
        required: true
    }
})

module.exports = mongo.model("Vault", vaultSchema)