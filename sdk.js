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
			// if(on_ready != null) {
			// 	this.bridge.onload = async function() {
			// 		if(adapter != null) {
			// 			await _this.connectWallet(adapter);
			// 		}
			// 		if(network != null) {
			// 			await _this.connectNetwork(network, commitment);
			// 		}
			// 		on_ready();
			// 	}
			// }

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

		let connectWalletPhantom = () => {
			return new Promise(async (resolve, reject) => {
				if("solana" in window) {
					window.solana.connect().then((w) => {
						window.solana.on('disconnect', () => {
							_this.sendRaw({type: "nullifyWallet"});
						});
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
								_this.sendRaw({type: "nullifyWallet"});
							});
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
					slope.connect().then((w) => {
						if(w.msg == "ok" && w.data != null && w.data.publicKey != null) {
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
							_this.sendRaw({type: "nullifyWallet"});
						});
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
						})
					} else if(data.command == "signTransaction") {
						connectWalletPhantom().then(() => {
							window.solana.request({
								method: "signTransaction",
								params: {
									message: data.serializedMessage,
								}
							}).then(async (signedTransaction) => {
								send({signature: signedTransaction.signature}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							})
						}).catch((err) => {
							error(err, data.resolverToken);
						})
					} else if(data.command == "signMessage") {
						connectWalletPhantom().then(() => {
							window.solana.request({
								method: "signMessage",
								params: {
									message: data.encodedMessage,
									display: "utf8",
								}
							}).then(async (signed) => {
								send({
									signature: signed.signature
								}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						})
					}
				} else if(data.type == "solflare") {
					if(data.command == "connect") {
						connectWalletSolflare().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						})
					} else if(data.command == "signTransaction") {
						connectWalletSolflare().then(() => {
							window.solflare.request({
								method: "signTransaction",
								params: {
									message: data.serializedMessage,
								}
							}).then(async (signedTransaction) => {
								send({signature: signedTransaction.signature}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							})
						}).catch((err) => {
							error(err, data.resolverToken);
						})
					} else if(data.command == "signMessage") {
						connectWalletSolflare().then(() => {
							window.solflare.request({
								method: "signMessage",
								params: {
									message: data.encodedMessage,
									display: "utf8",
								}
							}).then(async (signed) => {
								send({
									signature: signed.signature
								}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign message.", data.resolverToken);
							});
						}).catch((err) => {
							error(err, data.resolverToken);
						})
					}
				} else if(data.type == "slope") {
					if(data.command == "connect") {
						connectWalletSlope().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						})
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
									error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
								}
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							})
						}).catch((err) => {
							error(err, data.resolverToken);
						})
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
						})
					}
				} else if(data.type == "glow") {
					if(data.command == "connect") {
						connectWalletGlow().then((res) => {
							send(res, data.resolverToken);
						}).catch((err) => {
							error(err, data.resolverToken);
						})
					} else if(data.command == "signTransaction") {
						connectWalletGlow().then(() => {
							let transaction = {
								signatures: [],
								serialize: () => {
									return {
										toString: () => {
											return data.serialized
										}
									};
								},
								serializeMessage: () => {
									return {
										toString: () => {
											return data.serializedMessage
										}
									};
								},
								addSignature: (pubkey, signature) => {
									transaction.signatures.push(signature);
								}
							}
							window.glowSolana.signTransaction(transaction).then(async (signedTransaction) => {
								send({signature: signedTransaction.signatures[0]}, data.resolverToken);
							}).catch((err) => {
								error("SOL Pay SDK Fatal Error: Unable to sign transaction.", data.resolverToken);
							})
						}).catch((err) => {
							error(err, data.resolverToken);
						})
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
						})
					}
				}
			} catch(err) {
				return;
			}
		});

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

		this.adapters = {
			phantom: "PHANTOM",
			solflare: "SOLFLARE",
			slope: "SLOPE",
			glow: "GLOW",
			PHANTOM: "PHANTOM",
			SOLFLARE: "SOLFLARE",
			SLOPE: "SLOPE",
			GLOW: "GLOW"
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
