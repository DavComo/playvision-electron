import { browser, $, expect } from '@wdio/globals'
import AWS from 'aws-sdk';
import fs from 'fs';
import vm from 'vm';


const streamDataPath = new URL('../../.streamData.js', import.meta.url).pathname;
const scriptContent = fs.readFileSync(streamDataPath, 'utf8');

// Run the script content in the current context to access the streamData variable
vm.runInThisContext(scriptContent);

// Configure AWS once, globally
AWS.config.update({
    region: streamData.awsRegion,
    accessKeyId: streamData.accessKey,
    secretAccessKey: streamData.secretKey
});

// Create the DynamoDB DocumentClient once, globally
const docClient = new AWS.DynamoDB.DocumentClient();

async function getTestDbValue(primaryKey, secondaryKey) {
    const params = {
        TableName: 'test_database', // Replace with your table name
        Key: {
            'valueId': primaryKey // Replace with your primary key attribute name
        }
    };

    try {
        const data = await docClient.get(params).promise();
        if (data.Item) {
            return data.Item[secondaryKey];
        } else {
            console.log("No item found with the specified key.");
            return null;
        }
    } catch (err) {
        console.error("Unable to retrieve item. Error JSON:", JSON.stringify(err, null, 2));
        throw err; // Re-throw the error so it can be handled by the calling function
    }
}

describe('Electron App Testing', () => {
    it('should verify both iframes exist', async () => {
        await expect($('#top-panel')).toBeExisting()
        await expect($('#bottom-panel')).toBeExisting()
    })

    it('should verify that the OBS controller displays the connecting message', async () => {
        await browser.switchToParentFrame();

        const iframe = await $('#top-panel-iframe');
        await browser.switchToFrame(iframe);

        const errorTitle = $('#error-title');
        const text = await errorTitle.getText();
        expect(text === "Error connecting to OBS" || text === "Connecting...").toBe(true);

        await browser.switchToParentFrame();
    })

    it('should verify that access to AWS DynamoDB is functional both ways', async () => {
        await browser.switchToParentFrame();

        const iframe = await $('#bottom-panel-iframe');
        await browser.switchToFrame(iframe);

        await browser.pause(500);

        const blurrableElement = $('#blurrableElement')
        const blurrableElementClasses = await blurrableElement.getAttribute('class');
        const hasClassBlur = blurrableElementClasses.includes('blur');
        expect(hasClassBlur).toBe(false);

        await $('#serverName').setValue('test_database');

        await $('#resetValues').click();

        const serverStatus = await $('#serverStatus').getText();
        expect(serverStatus).toBe('Connected to test_database')

        const eventName = await $('#eventNameIs').getValue();
        expect(eventName).toBe('Hello World!');

        const eventTitle = await $('#eventTitle').getValue();
        expect(eventTitle).toBe('General Kenobi');

        browser.setupInterceptor();

        const randId = Math.floor(Math.random() * 100000).toString();
        await $('#pickTeamScoresTab').click();
        await $('#gameName').setValue(randId);
        await $('#saveValues').click();

        await browser.pause(500);

        let gameName = await getTestDbValue('gameScreen', 'gameName');
        expect(gameName).toBe(randId);

        await browser.switchToParentFrame();
    })
})
