const mongoose = require("mongoose");

const connectDb = async () => {
	try {
		const connect = await mongoose.connect(process.env.CONNECTION_STRING);
		console.log("Database Connected: ", 
			connect.connection.host, 
			connect.connection.name 
			);
	} catch(err) {
		console.log(err);
		process.exit(1);
	}
};

const vaultSchema = new mongoose.Schema({
    vaultCode: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String
    },
	expireAt: {
		type: Date,
		expires: '1m'
	},
	duration: {
		type: Number,
		required: true
	}
})

const Vault = mongoose.model("Vault", vaultSchema)

const fileVaultSchema = new mongoose.Schema({
    vault_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Vault"
    },
	fileName: {
		type: String,
		required: true
	},
    fileURL: {
        type: String,
        required: true
    },
})

const FileVault = mongoose.model("FileVault", fileVaultSchema)

module.exports = { connectDb, Vault, FileVault } 