const exp = require('constants');
const fs = require('fs');
const path = require('path');

describe('All installer files exist suite', () => {

  //Disable test in accordance with github actions using Ubuntu only
  test.skip('.dmg installer file exists test', done => {
    try {
      fs.stat("./dist/", (err, stats) => {
        const distPath = path.join(__dirname, 'dist');
        const files = fs.readdirSync(distPath);

        const dmgFileExists = files.some(file => file.endsWith('.dmg'));

        if (dmgFileExists) {
          done();
        } else {
          done('.dmg file does not exist');
        }
      });
    } catch (error) {
      done(error);
    }
  });

  //Disable test in accordance with github actions using Ubuntu only
  test.skip('.exe installer file exists test', done => {
    try {
      fs.stat("./dist/", (err, stats) => {
        const distPath = path.join(__dirname, 'dist'); 
        const files = fs.readdirSync(distPath);

        const exeFileExists = files.some(file => file.endsWith('.exe'));

        if (exeFileExists) {
          done();
        } else {
          done('.exe file does not exist');
        }
      });
    } catch (error) {
      done(error);
    }
  });

  test('.AppImage installer file exists test', done => {
    try {
      fs.stat("./dist/", (err, stats) => {
        const distPath = path.join(__dirname, 'dist'); 
        const files = fs.readdirSync(distPath);

        const appImageFileExists = files.some(file => file.endsWith('.AppImage'));

        if (appImageFileExists) {
          done();
        } else {
          done('.AppImage file does not exist');
        }
      });
    } catch (error) {
      done(error);
    }
  });
});
