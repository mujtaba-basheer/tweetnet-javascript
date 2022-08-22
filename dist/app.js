"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const fs = require("fs");
const minify = require("babel-minify");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const creds = new AWS.Credentials({
    accessKeyId: (_a = process.env) === null || _a === void 0 ? void 0 : _a.S3AccessKeyId,
    secretAccessKey: (_b = process.env) === null || _b === void 0 ? void 0 : _b.S3SecretAccessKey,
});
const S3 = new AWS.S3({ credentials: creds });
const filesToUpload = ["thank-you", "callback", "dashboard"];
function returnPromise(file) {
    return new Promise((res, rej) => {
        S3.upload({
            Bucket: "flow-ninja-assets",
            Key: `tweetnest/${file}.js`,
            Body: fs.createReadStream(`build/${file}.js`),
            ACL: "public-read",
            ContentType: "application/javascript",
            CacheControl: "no-cache",
        }, (err, data) => {
            if (err)
                rej(err);
            else {
                console.log(`uploaded: ${file}.js\t ✅`);
                console.log(`link: ${data.Location}\n`);
                res(null);
            }
        });
    });
}
for (const file of filesToUpload) {
    (async () => {
        const inputCode = fs.readFileSync(`dist/${file}.js`, {
            encoding: "utf8",
        });
        const outputCode = minify(inputCode, {}).code;
        fs.writeFileSync(`build/${file}.min.js`, outputCode, {
            encoding: "utf8",
        });
        await returnPromise(file + ".min");
    })();
}
