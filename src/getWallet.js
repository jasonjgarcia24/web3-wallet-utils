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

const { DEFAULT_NETWORK, RPC_PORT } = require('./config');

/**
 * An array of BIP4 wallet(s) and their associated balance(s).
 * 
 * @typedef {Array.<Array.<Wallet>, Array.<string>>} BIP4WalletArray
 * @see {@link getBIP44Wallet}
 */

/**
 * A private/public key pair
 * 
 * @typedef {Array.<Array.<string>, Array.<string>>} KeyPair
 * @see {@link getKeyPairs}
 */

/**
 * Ethereum Network
 * 
 * @type {string}
 */
let NETWORK = DEFAULT_NETWORK;

/**
 * Mnemonic Seed Phrase
 * 
 * @type {string} 
 */
let MNEMONIC = process.env.MNEMONIC;

/**
 * @returns {string} Returns the ALCHEMY RPC node key for the [network](#NETWORK) stored
 * in .env.
 */
const ALCHEMY_API_KEY = () => process.env[`ALCHEMY_${NETWORK}_KEY`];


/**
 * Get a JSON-RPC node provider per the set [network](#NETWORK).
 * 
 * @param {Array<string>} [addresses] Required for [network](#NETWORK)='GANACHE_CORE'. An
 * array of addresses. The address(es) should be derived from [mnemonic](#MNEMONIC).
 * @param {string} [network] The Ethereum [network](#NETWORK) operating on (e.g. 'rinkeby', 
 * 'ganache', 'ganache_core', ...).
 * @param {string} [balance] The balance to assign to each account/wallet.
 * @returns {JsonRpcProvider|Web3Provider|AlchemyProvider}
 */
const getProvider = (addresses = [], network = NETWORK, balance = '100') => {
    switch (network ? network.toUpperCase() : NETWORK) {
        case ('GANACHE'):
            const url = `http://127.0.0.1:${RPC_PORT.GANACHE}`;
            return new JsonRpcProvider(url);
        case ('GANACHE_CORE'):
            if (addresses === []) return null;

            const accounts = addresses.map(address => {
                return {
                    secretKey: Buffer.from(address, 'hex'),
                    balance: utils.parseEther(balance).toString(),
                }
            })
            return new Web3Provider(Ganache.provider({ accounts }));
        default:
            const key = ALCHEMY_API_KEY();
            return new AlchemyProvider(NETWORK.toLowerCase(), key);
    }
}

/**
 * @property {Function} printKeyPairs Print out the public and private key pairs along with
 * the associated balances in ETH.
 * @param {Array.<Wallet>} wallet An array of BIP4 wallet(s).
 * @param {string} balance An array of the associated balance(s) to the array of wallets.
 * @see getBIP44Wallet
 * @returns void
 */
const printKeyPairs = (wallet, balance) => {
    console.log('Available Accounts\n==================');
    wallet.forEach((_, i) => console.log(`(${i}) ${wallet[i].address} (${balance[i]} ETH)`))

    console.log('\nPrivate Keys\n==================')
    wallet.forEach((_, i) => console.log(`(${i}) ${wallet[i].privateKey}`))
    console.log()
}

/**
 * Get an array of BIP4 wallet(s) and their associated balance(s).
 * 
 * @param {string} [network] The Ethereum [network](#NETWORK) operating on (e.g. 'rinkeby', 
 * 'ganache', 'ganache_core', ...).
 * @param {number} [numberOfWallets] The total number of wallets to derive from the
 * [mnemonic](#MNEMONIC).
 * @param {string} [balance] The balance to assign to each account/wallet.
 * @returns {Promise<BIP4WalletArray>}
 */
const getBIP44Wallet = async (network = NETWORK, numberOfWallets = 10, balance = '100') => {
    NETWORK = network.toUpperCase();

    try {
        const path = (step) => `m/44'/60'/0'/0/${step}`;
        const wallet = [];
        const balances = [];
        let provider;
        let account;

        for (let i = 0; i < numberOfWallets; i++) {
            account = Wallet.fromMnemonic(MNEMONIC, path(i));

            if (!provider) {
                provider = getProvider([account.privateKey.substring(2)], NETWORK, balance);
            }

            account = new Wallet(account.privateKey, provider);

            balance = parseFloat(utils.formatEther(
                await account.getBalance()
            )).toString();

            wallet.push(account);
            balances.push(balance);
        }

        return [wallet, balances];
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }
}

/**
 * Get an array of the private keys derived from the [mnemonic](#MNEMONIC).
 * 
 * @param {string} [network] The Ethereum [network](#NETWORK) operating on (e.g. 'rinkeby', 
 * 'ganache', 'ganache_core', ...).
 * @param {number} [numberOfWallets] The total number of wallets to derive from the 
 * [mnemonic](#MNEMONIC).
 * @returns {Promise<Array.<string>>} privateKeys
 */
const getPrivateKeys = async (network = NETWORK, numberOfWallets = 10) => {
    NETWORK = network.toUpperCase();
    const [wallet, balance] = await getBIP44Wallet(NETWORK, numberOfWallets);

    printKeyPairs(wallet, balance);

    const privateKeys = [];
    wallet.forEach(account => privateKeys.push(account.privateKey.substring(2)))

    return privateKeys
}

/**
 * Get the private/public key pairs derived from the [mnemonic](#MNEMONIC). The number of key
 * pairs returned will be set by numberOfWallets.
 * 
 * @param {string} [network] The Ethereum [network](#NETWORK) operating on (e.g. 'rinkeby', 
 * 'ganache', 'ganache_core...).
 * @param {number} [numberOfWallets] The total number of wallets to derive from the 
 * [mnemonic](#MNEMONIC).
 * @param {string} [mnemonic] The [mnemonic](#MNEMONIC) to derive the wallets from.
 * @returns {Promise.<KeyPair>} keyPairs An array of arrays of both private and public  key 
 * pairs derived from the [mnemonic](#MNEMONIC) using [getBIP44Wallet](#getBIP44Wallet).
*/
const getKeyPairs = async (network = NETWORK, numberOfWallets = 10, mnemonic = MNEMONIC) => {
    MNEMONIC = mnemonic.toLowerCase();
    NETWORK = network.toUpperCase();

    const [wallet, balance] = await getBIP44Wallet(NETWORK, numberOfWallets);

    printKeyPairs(wallet, balance);

    const keyPairs = [];
    const publicKeys = [];
    const privateKeys = [];

    wallet.forEach(account => {
        publicKeys.push(account.address);
        privateKeys.push(account.privateKey.substring(2));
    });

    keyPairs.push(publicKeys);
    keyPairs.push(privateKeys);

    return keyPairs
}

module.exports = {
    getProvider,
    getBIP44Wallet,
    getPrivateKeys,
    getKeyPairs,
};
