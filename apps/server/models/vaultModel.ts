const mongo1 = require("mongoose")

const vaultSchema = mongo.Schema({
    vaultCode: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: false
    },
    duration: {
        type: Date,
        required: true
    }
})

module.exports = mongo1.model("Vault", vaultSchema)