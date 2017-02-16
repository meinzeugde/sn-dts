# Prerequisites

## 1. Download Node Modules

1. In this project folder, open your terminal and run:

```sh
npm install
```

## 2. Login to your instance and import the update set for the REST api endpoint:

1. `Navigator > System Update Sets > Retrieved Update Sets`
2. under `Related Links` choose `Import Update Set from XML` 
3. upload the xml file `sys_remote_update_set_dts_generator.xml`
4. back on the List View click on the imported record `Type Definition Generator`
5. click the button `Preview Update Set`
6. click the button `Commit Update Set`

## 3. Prepare your project

1. Copy the `dts-config.json` to the root of your project folder and modify to your needs
2. Make sure, that the following directory is available: `typings/servicenow-dts/GlideRecord`, otherwise create it
3. In your project folder, open your terminal and run:

```sh
node /c/sn-dts/app.js --config ./dts-config.json
```

OPTION: create a shortcut by adding the following line to your .bashrc, don't forget to `source ~/.bashrc`

```sh
alias sndts='node /c/sn-dts/app.js --config ./dts-config.json'
```

## 4. Start the script every time you need to update your typescript definitions