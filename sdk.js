(window || globalThis).SOLPay = (() => {
	const SOLPaySDK = function() {
		const ONE_BILLION = 1000000000;

		let adapter;
		let network;
		let commitment;
		let _this = this;

		bridgeLoading = false;

		let awaitBridgeLoaded = () => {
			return new Promise(async (resolve, reject) => {
				let interval = setInterval(() => {
					if(bridgeLoading == false) {
						clearInterval(interval);
						resolve();
					}
				}, 20);
			});
		}

		let createBridge = (on_ready) => {
			bridgeLoading = true;
			if(this.bridge != null) {
				try {
					this.bridge.remove();
				} catch(err) {

				}
			}
			this.bridge = document.createElement("iframe");
			this.bridge.classList.add("solpay-bridge");

			let resolverToken = randomToken();

			let returnFunction = async (event) => {
				if(event.origin !== "https://solpay.togatech.org") return;
				try {
					let data = event.data;
					if(data.resolverToken == resolverToken) {
						bridgeLoading = false;
						if(adapter != null) {
							await _this.connectWallet(adapter);
						}
						if(network != null) {
							await _this.connectNetwork(network, commitment);
						}
						if(on_ready != null && typeof on_ready == "function") {
							on_ready();
						}
						window.removeEventListener("message", returnFunction, false);
					}
				} catch(err) {
					reject(err);
				}
			}
			window.addEventListener("message", returnFunction, false);

			this.bridge.src = "https://solpay.togatech.org/sdk_frame.html?origin=" + encodeURIComponent(window.origin) + "&token=" + resolverToken;
			this.bridge.style.display = "none";
			let target;
			if(document.children != null && document.children[0] != null) {
				target = document.children[0];
			} else {
				target = document;
			}
			target.appendChild(this.bridge);
		}

		let randomToken = () => {
			return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
		}

		let send = (data, resolverToken) => {
			if(this.bridge == null || this.bridge.contentWindow == null) {
				createBridge(() => {
					this.bridge.contentWindow.postMessage({
						request_type: "inner_request",
						result: data,
						resolverToken: resolverToken
					}, "https://solpay.togatech.org");
				});
			} else {
				this.bridge.contentWindow.postMessage({
					request_type: "inner_request",
					result: data,
					resolverToken: resolverToken
				}, "https://solpay.togatech.org");
			}
		}

		let error = (data, resolverToken) => {
			if(this.bridge == null || this.bridge.contentWindow == null) {
				createBridge(() => {
					this.bridge.contentWindow.postMessage({
						request_type: "inner_request",
						error: data,
						resolverToken: resolverToken
					}, "https://solpay.togatech.org");
				});
			} else {
				this.bridge.contentWindow.postMessage({
					request_type: "inner_request",
					error: data,
					resolverToken: resolverToken
				}, "https://solpay.togatech.org");
			}
		}

		let transactionPolyfill = (data) => {
			return new Promise(async (resolve, reject) => {
				let addressInBase58 = data.feePayer;
				let addressInBytes = await this.addressToBytes(addressInBase58);
				let transaction = {
					signatures: [],
					nonceInfo: data.nonceInfo,
					recentBlockhash: data.recentBlockhash,
					instructions: data.instructions.map((instruction) => {
						let addressInBase58 = instruction.programId.addressInBase58;
						let addressInBytes = instruction.programId.addressInBytes;
						delete instruction.programId.addressInBase58;
						delete instruction.programId.addressInBytes;
						instruction.keys.map((key) => {
							let keyInBase58 = key.pubkey.keyInBase58;
							let keyInBytes = key.pubkey.keyInBytes;
							delete key.pubkey.keyInBase58;
							delete key.pubkey.keyInBytes;
							key.pubkey = {
								toBase58: () => {
									return keyInBase58;
								},
								toBuffer: () => {
									return keyInBytes;
								},
								toBytes: () => {
									return keyInBytes;
								},
								toJSON: () => {
									return keyInBase58;
								},
								toLocaleString: () => {
									return keyInBase58;
								},
								toString: () => {
									return keyInBase58;
								},
								_bn: {},
								equals: (publicKey) => {
									return publicKey.toBase58() == keyInBase58;
								}
							}
							return key;
						});
						instruction.programId = {
							toBase58: () => {
								return addressInBase58;
							},
							toBuffer: () => {
								return addressInBytes;
							},
							toBytes: () => {
								return addressInBytes;
							},
							toJSON: () => {
								return addressInBase58;
							},
							toLocaleString: () => {
								return addressInBase58;
							},
							toString: () => {
								return addressInBase58;
							},
							_bn: {},
							equals: (publicKey) => {
								return publicKey.toBase58() == addressInBase58;
							}
						}
						return instruction;
					}),
					feePayer: {
						toBase58: () => {
							return addressInBase58;
						},
						toBuffer: () => {
							return addressInBytes;
						},
						toBytes: () => {
							return addressInBytes;
						},
						toJSON: () => {
							return addressInBase58;
						},
						toLocaleString: () => {
							return addressInBase58;
						},
						toString: () => {
							return addressInBase58;
						},
						_bn: {},
						equals: (publicKey) => {
							return publicKey.toBase58() == addressInBase58;
						}
					},
					serialize: () => {
						console.log("serialize");
						console.log(data.serialized);
						return data.serialized;
					},
					serializeMessage: () => {
						console.log("serializeMessage");
						console.log(data.serializedMessage);
						return data.serializedMessage;
					},
					toJSON: () => {
						return {
							recentBlockhash: transaction.recentBlockhash || null,
							feePayer: transaction.feePayer ? transaction.feePayer.toJSON() : null,
							nonceInfo: transaction.nonceInfo
								? {
									nonce: transaction.nonceInfo.nonce,
									nonceInstruction: transaction.nonceInfo.nonceInstruction.toJSON(),
								}
								: null,
							instructions: transaction.instructions.map(instruction => instruction.toJSON()),
							signers: transaction.signatures.map(({publicKey}) => {
								return publicKey.toJSON();
							}),
						};
					},
					compileMessage: () => {
						function invariant(condition, message) {
							if (!condition) {
								throw new Error(message || 'Assertion failed');
							}
						}

						const {nonceInfo} = transaction;
						if (nonceInfo && data.instructions[0] != nonceInfo.nonceInstruction) {
							transaction.recentBlockhash = nonceInfo.nonce;
							transaction.instructions.unshift(nonceInfo.nonceInstruction);
						}
						const {recentBlockhash} = transaction;
						if (!recentBlockhash) {
							throw new Error('Transaction recentBlockhash required');
						}

						if (transaction.instructions.length < 1) {
							console.warn('No instructions provided');
						}

						let feePayer;
						if (transaction.feePayer) {
							feePayer = transaction.feePayer;
						} else if (transaction.signatures.length > 0 && transaction.signatures[0].publicKey) {
							// Use implicit fee payer
							feePayer = transaction.signatures[0].publicKey;
						} else {
							throw new Error('Transaction fee payer required');
						}

						for (let i = 0; i < transaction.instructions.length; i++) {
							if (transaction.instructions[i].programId === undefined) {
								throw new Error(
									`Transaction instruction index ${i} has undefined program id`,
								);
							}
						}

						const addressBytes = {};

						const programIds = [];
						const accountMetas = [];
						transaction.instructions.forEach(instruction => {
							instruction.keys.forEach(accountMeta => {
								accountMetas.push({...accountMeta});
							});

							const programId = instruction.programId.toString();
							addressBytes[programId] = instruction.programId.toBytes();
							if (!programIds.includes(programId)) {
								programIds.push(programId);
							}
						});

						// Append programID account metas
						programIds.forEach(programId => {
							let programInBase58 = programId;
							let programInBytes = addressBytes[programId];
							accountMetas.push({
								pubkey: {
									toBase58: () => {
										return programInBase58;
									},
									toBuffer: () => {
										return programInBytes;
									},
									toBytes: () => {
										return programInBytes;
									},
									toJSON: () => {
										return programInBase58;
									},
									toLocaleString: () => {
										return programInBase58;
									},
									toString: () => {
										return programInBase58;
									},
									_bn: {},
									equals: (publicKey) => {
										return publicKey.toBase58() == programInBase58;
									}
								},
								isSigner: false,
								isWritable: false,
							});
						});

						// Sort. Prioritizing first by signer, then by writable
						accountMetas.sort(function (x, y) {
							const pubkeySorting = x.pubkey.toBase58().localeCompare(y.pubkey.toBase58());
							const checkSigner = x.isSigner === y.isSigner ? 0 : x.isSigner ? -1 : 1;
							const checkWritable = x.isWritable === y.isWritable ? pubkeySorting : x.isWritable ? -1 : 1;
							return checkSigner || checkWritable;
						});

						// Cull duplicate account metas
						const uniqueMetas = [];
						accountMetas.forEach(accountMeta => {
							const pubkeyString = accountMeta.pubkey.toString();
							const uniqueIndex = uniqueMetas.findIndex(x => {
								return x.pubkey.toString() === pubkeyString;
							});
							if (uniqueIndex > -1) {
								uniqueMetas[uniqueIndex].isWritable = uniqueMetas[uniqueIndex].isWritable || accountMeta.isWritable;
							} else {
								uniqueMetas.push(accountMeta);
							}
						});

						// Move fee payer to the front
						const feePayerIndex = uniqueMetas.findIndex(x => {
							return x.pubkey.equals(feePayer);
						});
						if (feePayerIndex > -1) {
							const [payerMeta] = uniqueMetas.splice(feePayerIndex, 1);
							payerMeta.isSigner = true;
							payerMeta.isWritable = true;
							uniqueMetas.unshift(payerMeta);
						} else {
							uniqueMetas.unshift({
								pubkey: feePayer,
								isSigner: true,
								isWritable: true,
							});
						}

						// Disallow unknown signers
						for (const signature of transaction.signatures) {
							const uniqueIndex = uniqueMetas.findIndex(x => {
								return x.pubkey.equals(signature.publicKey);
							});
							if (uniqueIndex > -1) {
								if (!uniqueMetas[uniqueIndex].isSigner) {
									uniqueMetas[uniqueIndex].isSigner = true;
									console.warn(
										'Transaction references a signature that is unnecessary, ' +
										'only the fee payer and instruction signer accounts should sign a transaction. ' +
										'This behavior is deprecated and will throw an error in the next major version release.',
									);
								}
							} else {
								throw new Error(`unknown signer: ${signature.publicKey.toString()}`);
							}
						}

						let numRequiredSignatures = 0;
						let numReadonlySignedAccounts = 0;
						let numReadonlyUnsignedAccounts = 0;

						// Split out signing from non-signing keys and count header values
						const signedKeys = [];
						const unsignedKeys = [];
						uniqueMetas.forEach(({pubkey, isSigner, isWritable}) => {
							addressBytes[pubkey.toString()] = pubkey.toBytes();
							if (isSigner) {
								signedKeys.push(pubkey.toString());
								numRequiredSignatures += 1;
								if (!isWritable) {
									numReadonlySignedAccounts += 1;
								}
							} else {
								unsignedKeys.push(pubkey.toString());
								if (!isWritable) {
									numReadonlyUnsignedAccounts += 1;
								}
							}
						});

						let accountKeys = signedKeys.concat(unsignedKeys);
						const instructions = transaction.instructions.map(instruction => {
							const {bs58EncodedData, programId} = instruction;
							return {
								programIdIndex: accountKeys.indexOf(programId.toString()),
								accounts: instruction.keys.map(meta =>
									accountKeys.indexOf(meta.pubkey.toString()),
								),
								data: bs58EncodedData,
							};
						});

						instructions.forEach(instruction => {
							invariant(instruction.programIdIndex >= 0);
							instruction.accounts.forEach(keyIndex => invariant(keyIndex >= 0));
						});

						accountKeys = accountKeys.map(account => {
							accountInBase58 = account;
							accountInBytes = addressBytes[account];
							return {
								toBase58: () => {
									return accountInBase58;
								},
								toBuffer: () => {
									return accountInBytes;
								},
								toBytes: () => {
									return accountInBytes;
								},
								toJSON: () => {
									return accountInBase58;
								},
								toLocaleString: () => {
									return accountInBase58;
								},
								toString: () => {
									return accountInBase58;
								},
								_bn: {},
								equals: (publicKey) => {
									return publicKey.toBase58() == accountInBase58;
								}
							}
						});
						let indexToProgramIds = new Map();
						instructions.forEach(ix => indexToProgramIds.set(ix.programIdIndex, accountKeys[ix.programIdIndex]));

						return {
							header: {
								numRequiredSignatures,
								numReadonlySignedAccounts,
								numReadonlyUnsignedAccounts,
							},
							accountKeys,
							recentBlockhash,
							instructions,
							indexToProgramIds,
							serialize: () => {
								return data.serializedMessage;
							}
						};
					},
					addSignature: (pubkey, signature) => {
						transaction.signatures.push(signature);
					}
				};
				Object.defineProperty(transaction, "signature", {
					get: () => {
						if(transaction.signatures.length > 0) {
							return transaction.signatures[0].signature;
						}
						return null;
					}
				})
				resolve(transaction);
			});
		}

		this.sendRaw = (data) => {
			return new Promise(async (resolve, reject) => {
				let persistData = {...data};
				if(data.preconfirm != null) {
					delete data.preconfirm;
				}
				let resolverToken = randomToken();
				let preconfirmToken = randomToken();
				let returnFunction = (event) => {
					if(event.origin !== "https://solpay.togatech.org") return;
					try {
						let data = event.data;
						if(data.request_type != "inner_request" && data.resolverToken == resolverToken) {
							if(data.error == null) {
								if(persistData.type == "connectWallet") {
									adapter = persistData.adapter;
									this.adapters.CURRENT_ADAPTER = adapter;
									this.adapters.current_adapter = adapter;
								} else if(persistData.type == "connectNetwork") {
									network = persistData.network;
									commitment = persistData.commitment;
								}
								resolve(data.result);
							} else {
								reject(data.error);
							}
							window.removeEventListener("message", returnFunction, false);
						}
					} catch(err) {
						reject(err);
					}
				}
				window.addEventListener("message", returnFunction, false);
				if(persistData.preconfirm != null && typeof persistData.preconfirm == "function") {
					let preconfirmFunction = (event) => {
						try {
							let data = event.data;
							if(data.preconfirmToken == preconfirmToken) {
								if(data.error == null) {
									persistData.preconfirm(data.result);
								}
								window.removeEventListener("message", preconfirmFunction, false);
							}
						} catch(err) {
						}
					}
					window.addEventListener("message", preconfirmFunction, false);
				}
				data.resolverToken = resolverToken;
				data.preconfirmToken = preconfirmToken;
				if(bridgeLoading == true) {
					awaitBridgeLoaded().then(() => {
						this.bridge.contentWindow.postMessage(data, "https://solpay.togatech.org");
					});
				} else {
					if(this.bridge == null || this.bridge.contentWindow == null) {
						createBridge(() => {
							this.bridge.contentWindow.postMessage(data, "https://solpay.togatech.org");
						});
					} else {
						this.bridge.contentWindow.postMessage(data, "https://solpay.togatech.org");
					}
				}
			});
		}

		this.addressToBytes = (address = null) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "addressToBytes", address: address}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.bs58 = {};

		this.bs58.encode = (source) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "bs58.encode", source: source}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.bs58.decode = (string) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "bs58.decode", string: string}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.bs58.decodeUnsafe = (source) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "bs58.decodeUnsafe", source: source}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getRecentBlockhash = (commitment) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "getRecentBlockhash", commitment: commitment}).catch((err) => {
					reject(err);
				}));
			});
		}

		let connectWalletPhantom = () => {
			return new Promise(async (resolve, reject) => {
				if("solana" in window) {
					window.solana.connect().then((w) => {
						window.solana.on('disconnect', () => {
							this.wallet.isConnected = false;
							this.wallet.publicKey = undefined;
							_this.sendRaw({type: "nullifyWallet"});
						});
						this.wallet.publicKey = w.publicKey;
						this.wallet.isSolflare = false;
						this.wallet.isSlope = false;
						this.wallet.isGlow = false;
						this.wallet.isExodus = false;
						this.wallet.isPhantom = true;
						this.wallet.isConnected = true;
						resolve({address: w.publicKey.toBase58()});
					}).catch((err) => {
						reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
					});
				} else {
					_this.sendRaw({type: "adapterInstall", adapter: _this.adapters.PHANTOM});
					reject("SOL Pay SDK Fatal Error: Solana wallet not found!");
				}
			});
		}

		let connectWalletSolflare = () => {
			return new Promise(async (resolve, reject) => {
				if("solflare" in window) {
					window.solflare.connect().then((w) => {
						if(w) {
							window.solflare.on('disconnect', () => {
								this.wallet.isConnected = false;
								this.wallet.publicKey = undefined;
								_this.sendRaw({type: "nullifyWallet"});
							});
							this.wallet.publicKey = window.solflare.publicKey;
							this.wallet.isPhantom = false;
							this.wallet.isSlope = false;
							this.wallet.isGlow = false;
							this.wallet.isExodus = false;
							this.wallet.isSolflare = true;
							this.wallet.isConnected = true;
							resolve({
								address: window.solflare.publicKey.toBase58()
							});
						} else {
							reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
						}
					}).catch((err) => {
						reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
					});
				} else {
					_this.sendRaw({type: "adapterInstall", adapter: _this.adapters.SOLFLARE});
					reject("SOL Pay SDK Fatal Error: Solana wallet not found!");
				}
			});
		}

		let slope;

		let connectWalletSlope = () => {
			return new Promise(async (resolve, reject) => {
				if("Slope" in window) {
					if(slope == null) {
						slope = new window.Slope();
					}
					slope.connect().then(async (w) => {
						if(w.msg == "ok" && w.data != null && w.data.publicKey != null) {
							let addressInBytes = await this.addressToBytes(w.data.publicKey);
							let addressInBase58 = w.data.publicKey;
							this.wallet.publicKey = {
								toBase58: () => {
									return addressInBase58;
								},
								toBuffer: () => {
									return addressInBytes;
								},
								toBytes: () => {
									return addressInBytes;
								},
								toJSON: () => {
									return addressInBase58;
								},
								toLocaleString: () => {
									return addressInBase58;
								},
								toString: () => {
									return addressInBase58;
								},
								_bn: {},
								equals: (publicKey) => {
									return publicKey.toBase58() == addressInBase58;
								}
							};
							this.wallet.isPhantom = false;
							this.wallet.isSolflare = false;
							this.wallet.isGlow = false;
							this.wallet.isExodus = false;
							this.wallet.isSlope = true;
							this.wallet.isConnected = true;
							resolve({
								address: w.data.publicKey
							});
						} else {
							reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
						}
					}).catch((err) => {
						reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
					});
				} else {
					_this.sendRaw({type: "adapterInstall", adapter: _this.adapters.SLOPE});
					reject("SOL Pay SDK Fatal Error: Solana wallet not found!");
				}
			});
		}

		let connectWalletGlow = () => {
			return new Promise(async (resolve, reject) => {
				if("glowSolana" in window) {
					window.glowSolana.connect().then((w) => {
						window.glowSolana.on('disconnect', () => {
							this.wallet.isConnected = false;
							this.wallet.publicKey = undefined;
							_this.sendRaw({type: "nullifyWallet"});
						});
						this.wallet.publicKey = w.publicKey;
						this.wallet.isPhantom = false;
						this.wallet.isSolflare = false;
						this.wallet.isSlope = false;
						this.wallet.isExodus = false;
						this.wallet.isGlow = true;
						this.wallet.isConnected = true;
						resolve({address: w.publicKey.toBase58()});
					}).catch((err) => {
						reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
					});
				} else {
					_this.sendRaw({type: "adapterInstall", adapter: _this.adapters.GLOW});
					reject("SOL Pay SDK Fatal Error: Solana wallet not found!");
				}
			});
		}

		let connectWalletExodus = () => {
			return new Promise(async (resolve, reject) => {
				if("exodus" in window && window.exodus.solana != null) {
					window.exodus.solana.connect().then((w) => {
						window.exodus.solana.on('disconnect', () => {
							this.wallet.isConnected = false;
							this.wallet.publicKey = undefined;
							_this.sendRaw({type: "nullifyWallet"});
						});
						this.wallet.publicKey = w.publicKey;
						this.wallet.isSolflare = false;
						this.wallet.isSlope = false;
						this.wallet.isGlow = false;
						this.wallet.isExodus = true;
						this.wallet.isPhantom = false;
						this.wallet.isConnected = true;
						resolve({address: w.publicKey.toBase58()});
					}).catch((err) => {
						reject("SOL Pay SDK Fatal Error: Could not connect to Solana wallet!");
					});
				} else {
					_this.sendRaw({type: "adapterInstall", adapter: _this.adapters.EXODUS});
					reject("SOL Pay SDK Fatal Error: Solana wallet not found!");
				}
			});
		}

		window.addEventListener("message", async (event) => {
			if(event.origin !== "https://solpay.togatech.org") return;
			try {
				let data = event.data;
				if(data.type == "phantom") {
					if(data.command == "connect") {
						connectWalletPhantom().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signTransaction") {
						connectWalletPhantom().then(async () => {
							let transaction = await transactionPolyfill(data);
							window.solana.signTransaction(transaction).then(async (signedTransaction) => {
								send({signature: signedTransaction.signatures[0]}, data.resolverToken);
							}).catch((err) => {
								console.error(err);
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signMessage") {
						connectWalletPhantom().then(() => {
							window.solana.signMessage(data.encodedMessage, "utf8").then(async (signed) => {
								send({
									signature: signed.signature
								}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					}
				} else if(data.type == "solflare") {
					if(data.command == "connect") {
						connectWalletSolflare().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signTransaction") {
						connectWalletSolflare().then(async () => {
							let transaction = await transactionPolyfill(data);
							window.solflare.signTransaction(transaction).then(async (signedTransaction) => {
								send({signature: signedTransaction.signatures[0]}, data.resolverToken);
							}).catch((err) => {
								console.error(err);
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signMessage") {
						connectWalletSolflare().then(() => {
							window.solflare.signMessage(data.encodedMessage, "utf8").then(async (signed) => {
								send({
									signature: signed.signature
								}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					}
				} else if(data.type == "slope") {
					if(data.command == "connect") {
						connectWalletSlope().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signTransaction") {
						connectWalletSlope().then(() => {
							slope.signTransaction(data.serializedMessage).then(async (signedTransaction) => {
								try {
									if(signedTransaction.msg == "ok" && signedTransaction.data != null && signedTransaction.data.signature != null) {
										send({signature: signedTransaction.data.signature}, data.resolverToken);
									} else {
										error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
									}
								} catch(err) {
									console.error(err);
									error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
								}
							}).catch((err) => {
								console.error(err);
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signMessage") {
						connectWalletSlope().then(() => {
							slope.signMessage(data.encodedMessage).then(async (signed) => {
								try {
									if(signed.msg == "ok" && signed.data != null) {
										send({
											signature: signed.data.signature
										}, data.resolverToken);
									} else {
										error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
									}
								} catch(err) {
									error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
								}
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					}
				} else if(data.type == "glow") {
					if(data.command == "connect") {
						connectWalletGlow().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signTransaction") {
						connectWalletGlow().then(async () => {
							let transaction = await transactionPolyfill(data);
							window.glowSolana.signTransaction(transaction).then(async (signedTransaction) => {
								send({signature: signedTransaction.signatures[0]}, data.resolverToken);
							}).catch((err) => {
								console.error(err);
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signMessage") {
						connectWalletGlow().then(() => {
							window.glowSolana.signMessage(data.encodedMessage).then(async (signed) => {
								send({
									signature: signed.signature
								}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					}
				} else if(data.type == "exodus") {
					if(data.command == "connect") {
						connectWalletExodus().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signTransaction") {
						connectWalletExodus().then(async () => {
							let transaction = await transactionPolyfill(data);
							window.exodus.solana.signTransaction(transaction).then(async (signedTransaction) => {
								send({signature: signedTransaction.signatures[0]}, data.resolverToken);
							}).catch((err) => {
								console.error(err);
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					} else if(data.command == "signMessage") {
						connectWalletExodus().then(() => {
							window.exodus.solana.signMessage(data.encodedMessage).then(async (signed) => {
								send({
									signature: signed.signature
								}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						});
					}
				}
			} catch(err) {
				return;
			}
		});

		this.connectWallet = (adapter = this.adapters.CURRENT_ADAPTER || this.adapters.PHANTOM) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "connectWallet", adapter: adapter}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.connectNetwork = (network = "https://solana-api.projectserum.com", commitment = "confirmed") => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "connectNetwork", network: network, commitment: commitment}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.sendSolana = (address, amount, preconfirm = (details) => {}) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendSolanaLamports(address, Math.round(amount * ONE_BILLION), preconfirm).catch((err) => {
					reject(err);
				}));
			});
		}

		this.sendSolanaLamports = (address, lamports, preconfirm = (details) => {}) => {
			return new Promise(async (resolve, reject) => {
				this.signTransaction([{
					type: "solana_transfer",
					data: {
						address: address,
						lamports: lamports
					}
				}]).then(async (signed_tx) => {
					try {
						if(typeof preconfirm != "function") {
							preconfirm = (details) => {};
						}
						let res = preconfirm({
							from: signed_tx.from,
							to: address,
							lamports: lamports,
							signature: signed_tx.signature
						});
						if(res instanceof Promise) {
							await res;
						}
						this.broadcastSerializedTransaction(signed_tx.serialized_transaction).then((transaction) => {
							resolve({
								from: signed_tx.from,
								to: address,
								lamports: lamports,
								signature: transaction.signature
							});
						}).catch((err) => {
							reject(err);
						});
					} catch(err) {
						reject(`SOL Pay SDK Fatal Error: The preconfirm function returned an error, halting the transaction from being sent: ${err}`);
					}
				}).catch((err) => {
					reject(err);
				});
			});
		}

		this.sendTokens = (address, amount, token_address, preconfirm = (details) => {}) => {
			return new Promise(async (resolve, reject) => {
				this.signTransaction([{
					type: "spl_token_transfer",
					data: {
						token_address: token_address,
						address: address,
						amount: amount
					}
				}]).then(async (signed_tx) => {
					try {
						if(typeof preconfirm != "function") {
							preconfirm = (details) => {};
						}
						let res = preconfirm({
							from: signed_tx.from,
							to: address,
							amount: amount,
							token_address: token_address,
							signature: signed_tx.signature
						});
						if(res instanceof Promise) {
							await res;
						}
						this.broadcastSerializedTransaction(signed_tx.serialized_transaction).then((transaction) => {
							resolve({
								from: signed_tx.from,
								to: address,
								amount: amount,
								token_address: token_address,
								signature: transaction.signature
							});
						}).catch((err) => {
							reject(err);
						});
					} catch(err) {
						reject(`SOL Pay SDK Fatal Error: The preconfirm function returned an error, halting the transaction from being sent: ${err}`);
					}
				}).catch((err) => {
					reject(err);
				});
			});
		}

		this.sendTokensDecimal = (address, amount_decimal, token_address, preconfirm = (details) => {}) => {
			return new Promise(async (resolve, reject) => {
				this.signTransaction([{
					type: "spl_token_transfer",
					data: {
						token_address: token_address,
						address: address,
						amount_decimal: amount_decimal
					}
				}]).then(async (signed_tx) => {
					try {
						if(typeof preconfirm != "function") {
							preconfirm = (details) => {};
						}
						let res = preconfirm({
							from: signed_tx.from,
							to: address,
							amount_decimal: amount_decimal,
							token_address: token_address,
							signature: signed_tx.signature
						});
						if(res instanceof Promise) {
							await res;
						}
						this.broadcastSerializedTransaction(signed_tx.serialized_transaction).then((transaction) => {
							resolve({
								from: signed_tx.from,
								to: address,
								amount_decimal: amount_decimal,
								token_address: token_address,
								signature: transaction.signature
							});
						}).catch((err) => {
							reject(err);
						});
					} catch(err) {
						reject(`SOL Pay SDK Fatal Error: The preconfirm function returned an error, halting the transaction from being sent: ${err}`);
					}
				}).catch((err) => {
					reject(err);
				});
			});
		}

		this.signTransaction = (transfers) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "signTransaction", transfers: transfers}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.broadcastSerializedTransaction = (serialized_transaction) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "broadcastSerializedTransaction", serializedTransaction: serialized_transaction}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.signMessage = (message) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "signMessage", message: message}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getBalance = (address = null) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "getBalance", address: address}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getTokenBalances = (address = null) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "getTokenBalances", address: address}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getAccountInfo = (address = null) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "getAccountInfo", address: address}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getAssociatedTokenAddress = (token_address, address = null) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "getAssociatedTokenAddress", tokenAddress: token_address, address: address}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getTokenBalance = (token_address, address = null) => {
			return new Promise(async (resolve, reject) => {
				this.getAssociatedTokenAddress(token_address, address).then((associatedAddress) => {
					this.getAccountInfo(associatedAddress.address).then((accountInfo) => {
						if(accountInfo.lamports == null) {
							accountInfo.lamports = 0;
						}
						if(accountInfo.info == null) {
							accountInfo.info = {};
						}
						if(accountInfo.info.tokenAmount == null) {
							accountInfo.info.tokenAmount = {
								amount: "0",
								decimals: 0,
								uiAmount: 0,
								uiAmountString: "0"
							};
						}
						resolve({
							account: {
								address: associatedAddress.address,
								lamports: accountInfo.lamports
							},
							token: {
								balance: accountInfo.info.tokenAmount
							},
							raw_data: accountInfo
						})
					}).catch((err) => {
						reject(err);
					});
				}).catch((err) => {
					reject(err);
				});
			});
		}

		this.streamLamports = (address, lamportsPerSecond, refillLamports = 10 ** 7, thresholdLamports = 10 ** 5) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "streamLamports", address: address, lamportsPerSecond: lamportsPerSecond, refillLamports: refillLamports, thresholdLamports: thresholdLamports}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.streamTokensDecimal = (address, tokensDecimalPerSecond, refillTokensDecimal = 1, refillLamports = (5 * 10 ** 5), thresholdTokensDecimal = 10 ** (-2)) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "streamTokensDecimal", address: address, tokensDecimalPerSecond: tokensDecimalPerSecond, refillTokensDecimal: refillTokensDecimal, refillLamports: refillLamports, thresholdTokensDecimal: thresholdTokensDecimal}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.getStreamDetails = (stream) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "getStreamDetails", stream: stream}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.refillStream = (stream) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "refillStream", stream: stream}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.pauseStream = (stream) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "pauseStream", stream: stream}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.resumeStream = (stream) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "resumeStream", stream: stream}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.closeStream = (stream) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "closeStream", stream: stream}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.backupStreamWallet = () => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "backupStreamWallet"}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.stakePool = {};
		
		this.stakePool.depositLamports = (lamports, referral_account = undefined, pool = undefined) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "stakePool.depositLamports", lamports: lamports, referral_account: referral_account, pool: pool}).catch((err) => {
					reject(err);
				}));
			});
		}
		this.stakePool.withdrawDecimal = (amount_decimal, pool = undefined) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "stakePool.withdrawDecimal", amount_decimal: amount_decimal, pool: pool}).catch((err) => {
					reject(err);
				}));
			});
		}
		this.stakePool.withdrawStakeDecimal = (amount_decimal, pool = undefined, useReserve = false) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "stakePool.withdrawStakeDecimal", amount_decimal: amount_decimal, pool: pool, useReserve: useReserve}).catch((err) => {
					reject(err);
				}));
			});
		}
		this.stakePool.info = (pool = undefined) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "stakePool.info", pool: pool}).catch((err) => {
					reject(err);
				}));
			});
		}
		
		this.tokens = {};

		this.tokens.getData = (address) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "tokens.getData", address: address}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.tokens.getTags = () => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "tokens.getTags"}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.tokens.getToken = (address, skip_validation = false) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "tokens.getToken", address: address, skipValidation: skip_validation}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.tokens.search = (search, param, compare_type = "equals", skip_validation = false) => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "tokens.search", search: search, param: param, compareType: compare_type, skipValidation: skip_validation}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.tokens.getRawUnvalidatedList = () => {
			return new Promise(async (resolve, reject) => {
				resolve(await this.sendRaw({type: "tokens.getRawUnvalidatedList"}).catch((err) => {
					reject(err);
				}));
			});
		}

		this.wallet = {
			isConnected: false,
			isPhantom: false,
			isSolflare: false,
			isSlope: false,
			isGlow: false,
			isExodus: false,
			publicKey: undefined
		};

		this.wallet.signTransaction = (transaction) => {
			return new Promise(async (resolve, reject) => {
				if(this.wallet.isConnected) {
					transaction.feePayer = transaction.feePayer || this.wallet.publicKey || undefined;
					transaction.recentBlockhash = transaction.recentBlockhash || (await this.getRecentBlockhash('finalized')).blockhash;
					if(this.wallet.isPhantom) {
						connectWalletPhantom().then(async () => {
							window.solana.signTransaction(transaction).then(async (signedTransaction) => {
								resolve(signedTransaction);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
							})
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isSolflare) {
						connectWalletSolflare().then(async () => {
							window.solflare.signTransaction(transaction).then(async (signedTransaction) => {
								resolve(transaction);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
							})
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isSlope) {
						connectWalletSlope().then(async () => {
							slope.signTransaction(await this.bs58.encode(transaction.serializeMessage())).then(async (signedTransaction) => {
								try {
									if(signedTransaction.msg == "ok" && signedTransaction.data != null && signedTransaction.data.signature != null) {
										transaction.addSignature(this.wallet.publicKey, await this.bs58.decode(signedTransaction.data.signature));
										resolve(transaction);
									} else {
										reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
									}
								} catch(err) {
									reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
								}
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
							});
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isGlow) {
						connectWalletGlow().then(() => {
							window.glowSolana.signTransaction(transaction).then(async (signedTransaction) => {
								resolve(signedTransaction);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
							})
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isExodus) {
						connectWalletExodus().then(async () => {
							window.exodus.solana.signTransaction(transaction).then(async (signedTransaction) => {
								resolve(signedTransaction);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign transaction.");
							})
						}).catch((err) => {
							reject(err);
						});
					}
				} else {
					reject("SOL Pay SDK Fatal Error: No wallet connection found. Use SOLPay.connectWallet() to connect to a Solana wallet.");
				}
			});
		}

		this.wallet.signAllTransactions = (transactions) => {
			return new Promise(async (resolve, reject) => {
				let signedTransactions = [];
				for(let i = 0; i < transactions.length; i++) {
					signedTransactions.push(await this.wallet.signTransaction(transactions[i]));
				}
				resolve(signedTransactions);
			});
		}

		this.wallet.signMessage = (message) => {
			return new Promise(async (resolve, reject) => {
				if(this.wallet.isConnected) {
					let encodedMessage = (new TextEncoder()).encode(message);
					if(this.wallet.isPhantom) {
						connectWalletPhantom().then(() => {
							window.solana.signMessage(encodedMessage, "utf8").then(async (signed) => {
								resolve(signed.signature);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign message.");
							});
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isSolflare) {
						connectWalletSolflare().then(() => {
							window.solflare.signMessage(encodedMessage, "utf8").then(async (signed) => {
								resolve(signed.signature);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign message.");
							});
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isSlope) {
						connectWalletSlope().then(() => {
							slope.signMessage(encodedMessage).then(async (signed) => {
								try {
									if(signed.msg == "ok" && signed.data != null) {
										resolve(await this.bs58.decode(signed.data.signature));
									} else {
										reject("SOL Pay SDK Fatal Error: Unable to sign message.");
									}
								} catch(err) {
									reject("SOL Pay SDK Fatal Error: Unable to sign message.");
								}
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign message.");
							});
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isGlow) {
						connectWalletGlow().then(() => {
							window.glowSolana.signMessage(encodedMessage).then(async (signed) => {
								resolve(signed.signature);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign message.");
							});
						}).catch((err) => {
							reject(err);
						});
					} else if(this.wallet.isExodus) {
						connectWalletExodus().then(() => {
							window.exodus.solana.signMessage(encodedMessage).then(async (signed) => {
								resolve(signed.signature);
							}).catch((err) => {
								reject("SOL Pay SDK Fatal Error: Unable to sign message.");
							});
						}).catch((err) => {
							reject(err);
						});
					}
				} else {
					reject("SOL Pay SDK Fatal Error: No wallet connection found. Use SOLPay.connectWallet() to connect to a Solana wallet.");
				}
			});
		}

		this.wallet.disconnect = () => {
			return new Promise(async (resolve, reject) => {
				if(this.wallet.isPhantom) {
					window.solana.disconnect().then(async (res) => {
						this.wallet.isConnected = false;
						this.wallet.publicKey = undefined;
						await this.sendRaw({type: "nullifyWallet"});
						resolve();
					}).catch((err) => {
						reject(err);
					});
				} else if(this.wallet.isSolflare) {
					window.solflare.disconnect().then(async (res) => {
						this.wallet.isConnected = false;
						this.wallet.publicKey = undefined;
						await this.sendRaw({type: "nullifyWallet"});
						resolve();
					}).catch((err) => {
						reject(err);
					});
				} else if(this.wallet.isSlope) {
					slope.disconnect().then(async (res) => {
						if(res.msg == "ok") {
							this.wallet.isConnected = false;
							this.wallet.publicKey = undefined;
							await this.sendRaw({type: "nullifyWallet"});
							resolve();
						} else {
							reject("SOL Pay SDK Fatal Error: Unable to disconnect wallet.");
						}
					}).catch((err) => {
						reject(err);
					});
				} else if(this.wallet.isGlow) {
					window.glowSolana.disconnect().then(async (res) => {
						this.wallet.isConnected = false;
						this.wallet.publicKey = undefined;
						await this.sendRaw({type: "nullifyWallet"});
						resolve();
					}).catch((err) => {
						reject(err);
					});
				} else if(this.wallet.isExodus) {
					window.exodus.solana.disconnect()
					this.wallet.isConnected = false;
					this.wallet.publicKey = undefined;
					await this.sendRaw({type: "nullifyWallet"});
					resolve();
				}
			});
		}

		this.adapters = {
			phantom: "PHANTOM",
			solflare: "SOLFLARE",
			slope: "SLOPE",
			glow: "GLOW",
			exodus: "EXODUS",
			PHANTOM: "PHANTOM",
			SOLFLARE: "SOLFLARE",
			SLOPE: "SLOPE",
			GLOW: "GLOW",
			EXODUS: "EXODUS"
		};

		this.networks = {
			mainnet: {
				SOLANA: "https://api.mainnet-beta.solana.com",
				SERUM: "https://solana-api.projectserum.com",
				TRITON: "https://free.rpcpool.com",
				PHANTOM: "https://solana-mainnet.phantom.tech",
				GENESYSGO: "https://ssc-dao.genesysgo.net",
				SOLANAPAY: "https://solanapay.genesysgo.net"
			},
			devnet: {
				SOLANA: "https://api.devnet.solana.com"
			},
			testnet: {
				SOLANA: "https://api.testnet.solana.com"
			}
		};

		this.constants = {
			LAMPORTS_PER_SOL: 1000000000
		};
	}

	return new SOLPaySDK();
})();
