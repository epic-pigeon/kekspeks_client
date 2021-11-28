import EventEmitter from "./EventEmitter";

export default class API {
    static _keys;
    static async getKeys() {
        if (API._keys) return API._keys;
        if (localStorage.keys) {
            return await API.loadKeys();
        }
        throw new Error();
    }
    static hasKeys() {
        return !!(API._keys || localStorage.keys);
    }
    static async loadKeys() {
        let keys = JSON.parse(localStorage.keys), newKeys = {};
        newKeys.signKeyPair = {
            publicKey: await API.pemToPublicKey(keys.signKeyPair.publicKey, API.signKeyAlgorithm, ['verify']),
            privateKey: await API.pemToPrivateKey(keys.signKeyPair.privateKey, API.signKeyAlgorithm, ['sign']),
        };
        newKeys.messageKeyPair = {
            publicKey: await API.pemToPublicKey(keys.messageKeyPair.publicKey, API.messageKeyAlgorithm, ['encrypt']),
            privateKey: await API.pemToPrivateKey(keys.messageKeyPair.privateKey, API.messageKeyAlgorithm, ['decrypt']),
        };
        newKeys.users = {};
        if (keys.users) {
            for (let login in keys.users) if (keys.users.hasOwnProperty(login)) {
                newKeys.users[login] = {
                    signPublicKey: await API.pemToPublicKey(keys.users[login].signPublicKey, API.signKeyAlgorithm, ['verify']),
                    messagePublicKey: await API.pemToPublicKey(keys.users[login].messagePublicKey, API.messageKeyAlgorithm, ['encrypt']),
                };
            }
        }
        newKeys.groups = {};
        if (keys.groups) {
            for (let id in keys.groups) if (keys.groups.hasOwnProperty(id)) {
                newKeys.groups[id] = {
                    key: await API.stringToSymmetricKey(keys.groups[id].key, ['encrypt', 'decrypt']),
                };
            }
        }
        return API._keys = newKeys;
    }
    static async symmetricKeyToString(key) {
        return btoa(API.arrayBufferToString(await crypto.subtle.exportKey(
            "raw",
            key
        )));
    }
    static async stringToSymmetricKey(str, usage) {
        return await crypto.subtle.importKey(
            "raw",
            Uint8Array.from(atob(str), c => c.charCodeAt(0)),
            API.symmetricMessageKeyAlgorithm,
            true,
            usage
        );
    }
    static async setKeys(k) {
        if (!API._keys) API._keys = {};
        API._keys = Object.assign({}, API._keys, k);
        await API.saveKeys();
    }
    static async saveKeys() {
        let keys = Object.assign({}, API._keys), newKeys = {};
        newKeys.signKeyPair = {
            publicKey: await API.publicKeyToPem(keys.signKeyPair.publicKey),
            privateKey: await API.privateKeyToPem(keys.signKeyPair.privateKey),
        };
        newKeys.messageKeyPair = {
            publicKey: await API.publicKeyToPem(keys.messageKeyPair.publicKey),
            privateKey: await API.privateKeyToPem(keys.messageKeyPair.privateKey),
        };
        newKeys.users = {};
        if (keys.users) {
            for (let login in keys.users) if (keys.users.hasOwnProperty(login)) {
                newKeys.users[login] = {
                    signPublicKey: await API.publicKeyToPem(keys.users[login].signPublicKey),
                    messagePublicKey: await API.publicKeyToPem(keys.users[login].messagePublicKey),
                };
            }
        }
        newKeys.groups = {};
        if (keys.groups) {
            for (let id in keys.groups) if (keys.groups.hasOwnProperty(id)) {
                newKeys.groups[id] = {
                    key: await API.symmetricKeyToString(keys.groups[id].key),
                };
            }
        }
        localStorage.keys = JSON.stringify(newKeys);
    }
    static async downloadKeys() {
        await API.getKeys();
        await API.saveKeys();
        let a = document.createElement('a');
        let blob = new Blob([localStorage.keys]);
        a.href = URL.createObjectURL(blob);
        a.download = "keys.json";
        a.click();
    }
    static async uploadKeys(str) {
        if (API.hasKeys()) await API.downloadKeys();
        let v = localStorage.keys;
        localStorage.keys = str;
        try {
            await API.loadKeys();
        } catch (e) {
            localStorage.keys = v;
            await API.loadKeys();
            throw e;
        }
    }
    static async removeKeys() {
        if (API.hasKeys()) await API.downloadKeys();
        delete localStorage.keys;
        API._keys = undefined;
    }
    static async logout() {
        await API.downloadKeys();
        delete localStorage.keys;
        API._keys = undefined;
        API.setToken(undefined);
    }
    static _token;
    static async getToken() {
        if (API._token) return API._token;
        if (localStorage.token) {
            return API._token = localStorage.token;
        }
        throw new Error();
    }
    static setToken(t) {
        API._token = t;
        localStorage.token = t;
    }
    static signKeyAlgorithm = {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1])
    };
    static messageKeyAlgorithm = {
        name: "RSA-OAEP",
        hash: "SHA-256",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1])
    };
    static symmetricMessageKeyAlgorithm = {
        name: "AES-CBC",
        length: 256,
    };

    static async generateSignKeyPair() {
        return await crypto.subtle.generateKey(
            API.signKeyAlgorithm,
            true,
            ["sign", "verify"]
        );
    }

    static async generateMessageKeyPair() {
        return await crypto.subtle.generateKey(
            API.messageKeyAlgorithm,
            true,
            ["encrypt", "decrypt"]
        );
    }

    static async generateSymmetricKey() {
        return await crypto.subtle.generateKey(
            API.symmetricMessageKeyAlgorithm,
            true,
            ["encrypt", "decrypt"]
        );
    }

    static arrayBufferToString(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    static async publicKeyToPem(key) {
        const exported = await crypto.subtle.exportKey(
            "spki",
            key,
        );
        const base64 = btoa(API.arrayBufferToString(exported));
        return `-----BEGIN PUBLIC KEY-----\n${base64}\n-----END PUBLIC KEY-----\n`;
    }

    static async pemToPublicKey(pem, algorithm, usage) {
        let header = "-----BEGIN PUBLIC KEY-----\n";
        let footer = "\n-----END PUBLIC KEY-----\n";
        if (!pem.startsWith(header) || !pem.endsWith(footer)) throw new Error();
        let buf = Uint8Array.from(
            atob(pem.substring(header.length, pem.length - footer.length)),
            c => c.charCodeAt(0)
        ).buffer;
        return await crypto.subtle.importKey(
            "spki",
            buf,
            algorithm,
            true,
            usage
        );
    }

    static async privateKeyToPem(key) {
        const exported = await crypto.subtle.exportKey(
            "pkcs8",
            key,
        );
        const base64 = btoa(API.arrayBufferToString(exported));
        return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----\n`;
    }

    static async pemToPrivateKey(pem, algorithm, usage) {
        let header = "-----BEGIN PRIVATE KEY-----\n";
        let footer = "\n-----END PRIVATE KEY-----\n";
        if (!pem.startsWith(header) || !pem.endsWith(footer)) throw new Error();
        let buf = Uint8Array.from(
            atob(pem.substring(header.length, pem.length - footer.length)),
            c => c.charCodeAt(0)
        ).buffer;
        return await crypto.subtle.importKey(
            "pkcs8",
            buf,
            algorithm,
            true,
            usage
        );
    }

    static async signField(
        signKey,
        value,
        fieldName,
        signatureFieldName = fieldName + "_signature",
        timestampFieldName = signatureFieldName + "_timestamp",
    ) {
        let timestamp = Date.now() + "";
        let msg = Uint8Array.from([
            ...[...timestamp].map(c => c.charCodeAt(0)),
            0,
            ...[...value].map(c => c.charCodeAt(0)),
        ]);
        let signature = await crypto.subtle.sign(
            API.signKeyAlgorithm,
            signKey,
            msg,
        );
        signature = btoa(API.arrayBufferToString(signature));
        return {
            [fieldName]: value,
            [signatureFieldName]: signature,
            [timestampFieldName]: timestamp
        };
    }
    static async createSignUpRequest(signKeyPair, messageKeyPair, login, password) {
        return Object.assign({
            password: password,
            sign_public_key: await API.publicKeyToPem(signKeyPair.publicKey),
            message_public_key: await API.publicKeyToPem(messageKeyPair.publicKey),
        }, await API.signField(
            signKeyPair.privateKey,
            login,
            "login"
        ));
    }
    static _request({url = "https://zoelambert.art", method, endpoint, params, headers = {}}) {
        let requestUrl = url + endpoint;
        let requestHeaders = Object.assign({}, headers);
        let options = {method, headers: requestHeaders};
        if (method === "GET") {
            let body = Object.entries(params).map(it => encodeURIComponent(it[0]) + "=" + encodeURIComponent(it[1])).join("&");
            if (body) requestUrl += "?" + body;
        } else if (method === "POST") {
            //requestHeaders["Content-Type"] = "application/json;charset=UTF-8";
            requestHeaders["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
            //options.body = JSON.stringify(params);
            let body = Object.entries(params).map(it => encodeURIComponent(it[0]) + "=" + encodeURIComponent(it[1])).join("&");
            options.body = body;
        } else throw new Error();
        return fetch(requestUrl, options);
    }
    static _authRequests = [];
    static async _authRequest(args, wait = true) {
        async function req() {
            let accessToken = await API.getToken();
            let r = await API._request({
                method: "POST",
                endpoint: "/api/challenge",
                params: {access_token: accessToken}
            });
            if (!r.ok) throw new Error(await r.text());
            let challenge = (await r.json()).challenge;
            let keys = await API.getKeys();
            let signature = await crypto.subtle.sign(
                API.signKeyAlgorithm,
                keys.signKeyPair.privateKey,
                Uint8Array.from(challenge, c => c.charCodeAt(0)),
            );
            signature = btoa(API.arrayBufferToString(signature));
            let newParams = Object.assign({
                access_token: accessToken,
                challenge,
                challenge_signature: signature,
            }, args.params);
            return await API._request(Object.assign({}, args, {params: newParams}));
        }
        if (wait) {
            let idx = API._authRequests.length;
            let c = undefined;

            function f() {
                if (c) return c; else return c = req();
            }

            API._authRequests.push(f);
            for (let i = 0; i < idx; i++) {
                if (API._authRequests[i]) {
                    await API._authRequests[i]();
                    API._authRequests[i] = undefined;
                }
            }
            return await API._authRequests[idx]();
        } else return await req();
    }
    static async signUp(login, password) {
        let keys = {
            signKeyPair: await API.generateSignKeyPair(),
            messageKeyPair: await API.generateMessageKeyPair(),
        };
        let r = await API._request({
            method: "POST",
            endpoint: "/api/signup",
            params: await API.createSignUpRequest(
                keys.signKeyPair, keys.messageKeyPair,
                login, password
            ),
        });
        if (r.ok) {
            API.setToken((await r.json()).token);
            if (API.hasKeys()) await API.downloadKeys();
            await API.setKeys(keys);
        } else {
            throw new Error(await r.text());
        }
    }
    static async login(login, password, keysJson) {
        if (!API.hasKeys()) await API.uploadKeys(keysJson);
        let keys = await API.getKeys();
        console.log(keys)
        let r = await API._request({
            method: "POST",
            endpoint: "/api/login",
            params: Object.assign({
                password: password,
            }, await API.signField(
                keys.signKeyPair.privateKey,
                login,
                "login",
            )),
        });
        if (r.ok) {
            API.setToken((await r.json()).token);
        } else {
            throw new Error(await r.text());
        }
    }
    static async createGroup(name) {
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/create-group",
            params: { name },
        });
        if (r.ok) {
            let group = await r.json();
            let key = await API.generateSymmetricKey();
            await API.getKeys();
            if (!API._keys.groups) API._keys.groups = {};
            API._keys.groups[group._id] = {key: key};
            await API.saveKeys();
            return group;
        } else {
            throw new Error(await r.text());
        }
    }
    static async _getAll(f, skip, count) {
        if (typeof skip !== "number" || typeof count !== "number") throw new Error();
        if (skip < 0) skip = 0;
        if (count < 0) count = 0;
        let result = [];
        while (count > 0) {
            let r = await f(skip, count);
            if (r.length === 0) break;
            result.push(...r);
            count -= r.length;
            skip += r.length;
        }
        return result;
    }
    static async getGroups(skip = 0, count = 20) {
        return await API._getAll(
            async (skip, count) => {
                let r = await API._authRequest({
                    method: "POST",
                    endpoint: "/api/groups",
                    params: {
                        skip: skip,
                        count: count > 20 ? 20 : count,
                    }
                });
                if (!r.ok) throw new Error();
                return (await r.json()).groups;
            },
            skip, count
        );
    }
    static async getMessages(groupId, skip = 0, count = 50) {
        let messages = await API._getAll(
            async (skip, count) => {
                let r = await API._authRequest({
                    method: "POST",
                    endpoint: "/api/messages",
                    params: {
                        group_id: groupId,
                        skip: skip,
                        count: count > 50 ? 50 : count,
                    }
                });
                if (!r.ok) throw new Error();
                return (await r.json()).messages;
            },
            skip, count
        );
        let messageKey = (await API.getKeys()).groups[groupId].key;
        for (let m of messages) {
            await API.processMessage(m, messageKey);
        }
        return messages;
    }
    static async processMessage(m, messageKey) {
        let decrypted;
        //try {
            decrypted = new Uint8Array(await crypto.subtle.decrypt(
                Object.assign({}, API.symmetricMessageKeyAlgorithm, {
                    iv: Uint8Array.from(m.salt.data)
                }),
                messageKey,
                Uint8Array.from(m.content.data)
            ));
            m.decrypted = true;

        //} catch (e) {
        //    m.decrypted = false;
        //}
        if (m.decrypted) {
            let msg = "";
            let ptr = 0;
            for (; ptr < decrypted.length && decrypted[ptr] !== 0; ptr++) {
                msg += String.fromCharCode(decrypted[ptr]);
            }
            m.text = msg;
            if (m.hasSignature = ptr !== decrypted.length) {
                let signature = m.signature = decrypted.slice(ptr + 1);
                let {signPublicKey} = await API.getUserKeys(m.fromLogin);
                try {
                    m.verified = await crypto.subtle.verify(
                        API.signKeyAlgorithm,
                        signPublicKey,
                        signature,
                        decrypted.slice(0, ptr)
                    )
                } catch (e) {
                    m.verified = false;
                }
            }
        }
    }
    static async getUser(login) {
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/user",
            params: { login },
        });
        if (r.ok) {
            let res = await r.json();
            res.signPublicKey = await API.pemToPublicKey(res.signPublicKey, API.signKeyAlgorithm, ['verify']);
            res.messagePublicKey = await API.pemToPublicKey(res.messagePublicKey, API.messageKeyAlgorithm, ['encrypt']);
            if (!API._keys.users) API._keys.users = {};
            if (!API._keys.users[login]) {
                API._keys.users[login] = {
                    signPublicKey: res.signPublicKey,
                    messagePublicKey: res.messagePublicKey,
                };
            }
            await API.saveKeys();
            return res;
        } else {
            throw new Error(await r.text());
        }
    }
    static async getUserKeys(login) {
        if (API._keys.users && API._keys.users[login]) {
            return API._keys.users[login];
        }
        let res = await API.getUser(login);
        return {
            signPublicKey: res.signPublicKey,
            messagePublicKey: res.messagePublicKey,
        };
    }
    static async sendMessage(msg, groupId) {
        let keys = await API.getKeys();
        if (!keys.groups || !keys.groups[groupId]) {
            throw new Error();
        }
        msg = msg.trim();
        if (msg.length === 0) throw new Error();
        let signature = new Uint8Array(await crypto.subtle.sign(
            API.signKeyAlgorithm,
            keys.signKeyPair.privateKey,
            Uint8Array.from(msg, c => c.charCodeAt(0)),
        ));
        let content = Uint8Array.from([
            ...[...msg].map(c => c.charCodeAt(0)),
            0,
            ...signature
        ]);
        let iv = crypto.getRandomValues(new Uint8Array(16));
        let encrypted = await crypto.subtle.encrypt(
            Object.assign({}, API.symmetricMessageKeyAlgorithm, {iv}),
            keys.groups[groupId].key,
            content
        );
        let b64 = btoa(API.arrayBufferToString(encrypted));
        let ivb64 = btoa(API.arrayBufferToString(iv));
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/send-message",
            params: {
                id: groupId,
                message: b64,
                salt: ivb64,
            },
        });
        if (r.ok) {
            let m = await r.json();
            let messageKey = (await API.getKeys()).groups[groupId].key;
            await API.processMessage(m, messageKey);
            return m;
        } else {
            throw new Error(await r.text());
        }
    }
    static async inviteToGroup(groupId, login) {
        let groupKey = await API.symmetricKeyToString((await API.getKeys()).groups[groupId].key);
        let msgKey = (await API.getUserKeys(login)).messagePublicKey;
        let encrypted = await crypto.subtle.encrypt(
            API.messageKeyAlgorithm,
            msgKey,
            Uint8Array.from(groupKey, c => c.charCodeAt(0))
        );
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/invite",
            params: {
                login,
                group_id: groupId,
                key: btoa(API.arrayBufferToString(encrypted))
            }
        });
        if (r.ok) {
            // yay
        } else {
            throw new Error(await r.text());
        }
    }
    static async getInvitations(skip, count) {
        return await API._getAll(
            async (skip, count) => {
                let r = await API._authRequest({
                    method: "POST",
                    endpoint: "/api/get-invites",
                    params: {
                        skip: skip,
                        count: count > 20 ? 20 : count,
                    }
                });
                if (!r.ok) throw new Error();
                return (await r.json()).invitations;
            },
            skip, count
        );
    }
    static async acceptInvitation(inv) {
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/remove-invite",
            params: {
                group_id: inv.groupId,
                accept: "true"
            }
        });
        if (r.ok) {
            let msgKey = (await API.getKeys()).messageKeyPair.privateKey;
            let decrypted = await crypto.subtle.decrypt(
                API.messageKeyAlgorithm,
                msgKey,
                Uint8Array.from(inv.key.data)
            );
            let key = await API.stringToSymmetricKey(String.fromCharCode(...new Uint8Array(decrypted)), ['encrypt', 'decrypt']);
            if (!API._keys.groups) API._keys.groups = {};
            API._keys.groups[inv.groupId] = {key};
            await API.saveKeys();
            return await r.json();
        } else {
            throw new Error(await r.text());
        }
    }
    static async declineInvitation(inv) {
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/remove-invite",
            params: {
                group_id: inv.groupId,
                accept: "false"
            }
        });
        if (r.ok) {
            // nay
        } else {
            throw new Error(await r.text());
        }
    }
    static async getMe() {
        let r = await API._authRequest({
            method: "POST",
            endpoint: "/api/me",
            params: {}
        });
        if (r.ok) {
            return await r.json();
        } else {
            throw new Error(await r.text());
        }
    }
    static pollEventEmitter() {
        let eventEmitter = new EventEmitter();
        new Promise(async () => {
            while (true) {
                let r, e, start = Date.now();
                try {
                    r = await API._authRequest({
                        method: "POST",
                        endpoint: "/api/poll",
                        params: {}
                    }, false);
                } catch (err) {
                    e = err
                }
                if (r && r.ok) {
                    let ev = await r.json();
                    if (ev.type === "message") {
                        let messageKey = (await API.getKeys()).groups[ev.groupId].key;
                        await API.processMessage(ev.message, messageKey);
                    }
                    eventEmitter.emit(ev.type, ev);
                } else {
                    if (r) {
                        let text = await r.text();
                        if (r.status === 408 && text === "Poll timeout") {
                            continue;
                        }
                        throw new Error(text);
                    } else {
                        if (start + 30_000 > Date.now()) throw e;
                    }
                }
            }
        });
        return eventEmitter;
    }
}
