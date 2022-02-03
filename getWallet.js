require('dotenv').config({ path: '.env' })

const { ethers, utils } = require('ethers');
const { DEFAULT_NETWORK, RPC_PORT } = require('./config');
const Ganache = require('ganache-core');
const Wallet = ethers.Wallet;

let NETWORK = DEFAULT_NETWORK;
const ALCHEMY_API_KEY = () => process.env[`ALCHEMY_${NETWORK}_KEY`];
const MNEMONIC = process.env.MNEMONIC;


const getProvider = (network, addresses, balance = '100') => {
    switch (network ? network.toUpperCase() : NETWORK) {
        case ('GANACHE'):
            const url = `http://127.0.0.1:${RPC_PORT.GANACHE}`;
            return new ethers.providers.JsonRpcProvider(url);
        case ('GANACHE_CORE'):
            const accounts = addresses.map(address => {
                return {
                    secretKey: Buffer.from(address, 'hex'),
                    balance: utils.parseEther(balance).toString(),
                }
            })
            return new ethers.providers.Web3Provider(Ganache.provider({ accounts }));
        default:
            const key = ALCHEMY_API_KEY();
            return new ethers.providers.AlchemyProvider(NETWORK.toLowerCase(), key);
    }
}

const printKeyPairs = (wallet, balance) => {
    console.log('Available Accounts\n==================');
    wallet.forEach((_, i) => console.log(`(${i}) ${wallet[i].address} (${balance[i]} ETH)`))

    console.log('\nPrivate Keys\n==================')
    wallet.forEach((_, i) => console.log(`(${i}) ${wallet[i].privateKey}`))
    console.log()
}

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
                provider = getProvider(NETWORK, [account.privateKey.substring(2)], balance);
            }

            account = new Wallet(account.privateKey, provider);

            balance = await account.getBalance();
            balance = parseFloat(utils.formatEther(balance));

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

const getPrivateKeys = async (network = NETWORK, numberOfWallets = 10) => {
    NETWORK = network.toUpperCase();
    const [wallet, balance] = await getBIP44Wallet(NETWORK, numberOfWallets);

    printKeyPairs(wallet, balance);

    const privateKeys = [];
    wallet.forEach(account => privateKeys.push(account.privateKey.substring(2)))

    return privateKeys
}

const getKeyPairs = async (network = NETWORK, numberOfWallets = 10) => {
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
