# Prerequisites

## 1. Download Node Modules

1. Within this folder, open your terminal and run:

```sh
npm install
```

## 2. Login to your instance and import the update set for the REST api endpoint:

1. `Navigator > System Update Sets > Retrieved Update Sets`
2. under `Related Links` choose `Import Update Set from XML` 
3. upload the xml file `sys_remote_update_set_dts_generator.xml` (found in this folder)
4. back on the List View click on the imported record `Type Definition Generator`
5. click the button `Preview Update Set`
6. click the button `Commit Update Set`

## 3. Prepare your project

1. To Enable automatic detection of all typescript files, create a file `jsconfig.json` on the root of your project folder and insert the following content:

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

2. Copy the `dts-config.json` to the root of your project folder and set your instance and credentials (!)
3. Make sure, that the following directory is available: `typings/servicenow-dts/GlideRecord`, otherwise create it
4. _Workaround for a bug:_ Remove the following directory including all files: `typings/servicenow-dts/client` (otherwise auto-completion for SNOW won't work as intented)
4. In your project folder, open your terminal and run:

```sh
node /c/sn-dts/app.js --config ./dts-config.json
```

6. OPTION: create a shortcut by adding the following line to your .bashrc, don't forget to `source ~/.bashrc` afterwards.

```sh
alias sndts='node /c/sn-dts/app.js --config ./dts-config.json'
```

## 4. Start the script every time you need to update your typescript definitions