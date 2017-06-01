# Tribute

This project uses source code of two other awesome libraries:

* https://github.com/dynamicdan/sn-filesync
* https://github.com/matthaak/snow-runner

Many thanks for giving me inspiration (...and sorry for some cheap copy&paste)!

# Intention

The use case for this is to have Auto-Completion for GlideRecord in your Editor/IDE/whatever-supports-typings.

# Prerequisites

## 1. Download Node Modules

1. Within this folder, open your terminal and run:

```sh
npm install
```

## 2. Prepare your project

1. To Enable automatic detection of all typescript files in Visual Studio Code, create a file `jsconfig.json` on the root of your project folder and insert the following content:

```json
{
    "compilerOptions": {
        "target": "ES6"
    },
    "exclude": [
        "node_modules"
    ]
}
``` 

2. Copy the `app.config.json` to the root of your project folder and set your instance and credentials (!)

3. ALTERNATIVE: if you should already have an existing config file from the project `dynamicdan/sn-filesync`, you could also just add the following to that config file (use the name of your config file for the next steps instead of `app.config.json`):

```json
"tables": [
    "someTable", "..."
]
```

3. In your project folder, open your terminal and run:

```sh
node /c/sn-dts/app.js --config ./app.config.json
```

4. Find the downloaded Definition files in `yourproject/typings/sn-dts/GlideRecord` (Tada!)

## 3. Create Shortcut (in bash)

add the following line to your .bashrc, don't forget to `source ~/.bashrc` afterwards.

```sh
alias sndts='node /c/sn-dts/app.js --config ./app.config.json'
```

Start the script every time you need to update your typescript definitions:

```sh
sndts
```

# Development

## Test

Within this project there is a `test` folder with an example config.
Just copy and rename `app.config.json.example` to `app.config.json` (do not delete the original file).
After editing the new config file with the appropriate credentials you might test with `node bin/app.js --config ./test/app.config.json`.
