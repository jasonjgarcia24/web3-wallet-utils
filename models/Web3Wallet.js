// @ts-nocheck

require('dotenv').config({ path: '../.env' })
const Ganache = require('ganache-core');
const { utils, Wallet, ethers:
    {
        providers: {
            JsonRpcProvider,
            Web3Provider,
            AlchemyProvider
        }
    }
} = require('ethers');

const { DEFAULT_NETWORK, RPC_PORT } = require('../src/config');

/**
 * Object containing Web3Wallet input parameters.
 * 
 * @typeof {Object} WalletParamsObj
 * @property {string} [mnemonic] The mnemonic to derive the wallet accounts from.
 * @property {string} [network] The Ethereum network.
 * @property {string} [rpcPort] The JSON-RPC node port.
 * @property {string} [balance] The balance(s) of the Ethereum account(s) derived from the 
 * [mnemonic](#mnemonic).
 * @property {number} [numberOfWallets] The number of accounts to make.
 */

/**
 * An array of BIP4 wallet(s) and their associated balance(s).
 * 
 * @typedef {Array.<Array.<Wallet>, Array.<string>>} BIP44WalletArray
 * @see {@link getBIP44Wallet}
 */

/**
 * A private/public key pair.
 * 
 * @typedef {Array.<Array.<string>, Array.<string>>} KeyPair
 * @see {@link getKeyPairs}
 */

/**
 * Class to create a mnemonic derived wallet and query and/or set balances.
 */
class Web3Wallet {
    #mnemonic;
    #network;
    #rpcPort;
    #balance;
    #numberOfWallets;
    #provider;
    #bip44Wallet;

    /**
     * @param {walletParamsObj} [walletParamsObj] The input parameter object for building the
     * Web3 wallet.
     */
    constructor(walletParamsObj = {
        mnemonic: process.env.MNEMONIC,
        network: DEFAULT_NETWORK,
        rpcPort: RPC_PORT.GANACHE,
        balance: '100',
        numberOfWallets: 10
    }) {
        /**
         * @property {string} [mnemonic] The mnemonic to derive the wallet accounts from.
         * @property {string} [network] The Ethereum network.
         * @property {string} [rpcPort] The JSON-RPC node port.
         * @property {string} [balance] The balance(s) of the Ethereum account(s) derived
         * from the [mnemonic](#mnemonic).
         * @property {number} [numberOfWallets] The number of accounts to make.
         * @property {JsonRpcProvider|Web3Provider|AlchemyProvider} [provider] The JSON-RPC
         * node provider.
         * @property {Promise<BIP44WalletArray>} [bip44Wallet] The BIP44 wallet and
         * associated balances.
         */
        this.#mnemonic = walletParamsObj?.mnemonic ? walletParamsObj.mnemonic : process.env.MNEMONIC;
        this.#network = walletParamsObj?.network ? walletParamsObj.network : DEFAULT_NETWORK;
        this.#rpcPort = walletParamsObj?.rpcPort ? walletParamsObj.rpcPort : RPC_PORT.GANACHE;
        this.#balance = walletParamsObj?.balance ? walletParamsObj.balance : '100';
        this.#numberOfWallets = walletParamsObj?.numberOfWallets ? walletParamsObj.numberOfWallets : 10;
        this.#provider;
        this.#bip44Wallet;

        this.getBIP44Wallet();
    }

    get mnemonic() { return this.#mnemonic; }
    get network() { return this.#network; }
    get balance() { return this.#balance; }
    get numberOfWallets() { return this.#numberOfWallets; }
    get provider() { return this.#provider; }
    get bip44Wallet() { return this.#bip44Wallet; }

    set network(_network) {
        this.#network = _network;
        this.#provider = null;
        this.getBIP44Wallet();
    }

    set rpcPort(_rpcPort) {
        this.#rpcPort = _rpcPort;
        this.#provider = null;
        this.getBIP44Wallet();
    }

    set balance(_balance) {
        this.#balance = _balance;
        this.#provider = null;
        this.getBIP44Wallet();
    }

    set numberOfWallets(_numberOfWallets) {
        this.#numberOfWallets = _numberOfWallets;
        this.#provider = null;
        this.getBIP44Wallet();
    }

    /**
     * @property {Function} getAlchemyApiKey returns the ALCHEMY RPC node key for the
     * [network](network).
     * @returns {string} The ALCHEMY RPC node key for the [network](#network).
     */
    #getAlchemyApiKey = () => process.env[`ALCHEMY_${this.#network}_KEY`];

    /**
     * @property {Function} setProvider Set a JSON-RPC node provider per the set
     * [network](#network).
     * @param {Array<string>} [addresses] Required for [network](#network)='GANACHE_CORE'. An
     * array of addresses. The address(es) should be derived from [mnemonic](#mnemonic).
     * @returns void
     */
    #setProvider = (addresses = []) => {
        console.log(this.#network)
        switch (this.#network.toUpperCase()) {
            case ('GANACHE'):
                const _url = `http://127.0.0.1:${this.#rpcPort}`;
                this.#provider = new JsonRpcProvider(_url);
                return
            case ('GANACHE_CORE'):
                if (addresses === []) {
                    this.#provider = null;
                    return;
                }

                const _accounts = addresses.map(address => {
                    return {
                        secretKey: Buffer.from(address, 'hex'),
                        balance: utils.parseEther(this.#balance).toString(),
                    }
                })
                this.#provider = new Web3Provider(Ganache.provider({ accounts: _accounts }));
                return
            default:
                const _key = this.#getAlchemyApiKey();
                this.#provider = new AlchemyProvider(this.#network.toLowerCase(), _key);
                return
        }
    }

    /**
     * @property {Function} printKeyPairs Print out the public and private key pairs along with
     * the associated balances in ETH.
     * @see getBIP44Wallet
     * @returns void
     */
    printKeyPairs = () => {
        const [_wallets, _balances] = this.#bip44Wallet;

        console.log('Available Accounts\n==================');
        _wallets.forEach((_, i) => console.log(`(${i}) ${_wallets[i].address} (${_balances[i]} ETH)`))

        console.log('\nPrivate Keys\n==================');
        _wallets.forEach((_, i) => console.log(`(${i}) ${_wallets[i].privateKey}`))
        console.log();
    }

    /**
     * @property {Function} getBIP44Wallet Get an array of BIP4 wallet(s) and their
     * associated balance(s).
     * @see setProvider
     * @returns void
     */
    getBIP44Wallet = async () => {
        try {
            const _path = (step) => `m/44'/60'/0'/0/${step}`;
            const _wallet = [];
            const _balances = [];
            let _account;
            let _balance;

            for (let i = 0; i < this.#numberOfWallets; i++) {
                _account = Wallet.fromMnemonic(this.#mnemonic, _path(i));

                if (!this.#provider) {
                    this.#setProvider(
                        [_account.privateKey.substring(2)], this.#network, this.#balance
                    );
                }

                _account = new Wallet(_account.privateKey, this.#provider);

                _balance = parseFloat(utils.formatEther(
                    await _account.getBalance()
                )).toString();

                _wallet.push(_account);
                _balances.push(_balance);
            }

            this.#bip44Wallet = [_wallet, _balances];
        }
        catch (err) {
            console.log(err);
            process.exit(1);
        }
    }

    /**
     * @property {Function} getPrivateKeys Get an array of the private keys derived from the 
     * [mnemonic](#mnemonic).
     * @see getBIP44Wallet
     * @returns {Promise<Array.<string>>} privateKeys
     */
    getPrivateKeys = async () => {
        const [_wallet, _] = this.#bip44Wallet;

        const _privateKeys = [];
        _wallet.forEach(_account => _privateKeys.push(_account.privateKey.substring(2)))

        return _privateKeys
    }

    /**
     * @property {Function} getKeyPairs Get the private/public key pairs derived from the 
     * [mnemonic](#mnemonic). The number of key pairs returned will be set by numberOfWallets.
     * @see getBIP44Wallet
     * @returns {Promise.<KeyPair>} keyPairs An array of arrays of both private and public  key 
     * pairs derived from the [mnemonic](#mnemonic) using [getBIP44Wallet](#getBIP44Wallet).
    */
    getKeyPairs = async () => {
        const [_wallet, _] = this.#bip44Wallet;

        const _keyPairs = [];
        const _publicKeys = [];
        const _privateKeys = [];

        _wallet.forEach(_account => {
            _publicKeys.push(_account.address);
            _privateKeys.push(_account.privateKey.substring(2));
        });

        _keyPairs.push(_publicKeys);
        _keyPairs.push(_privateKeys);

        return _keyPairs
    }
}

module.exports = Web3Wallet;