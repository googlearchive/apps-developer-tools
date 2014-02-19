//usr/bin/env node $0 $*; exit $?

var childProcess = require('child_process');
var fs = require('fs');
var path = require("path");

var projectName = 'apps-developer-tools';
var repository = 'https://github.com/GoogleChrome/apps-developer-tools';
var workDir = process.env.HOME + '/ADTBuilds';

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}

function exec(cmd, onSuccess, opt_onError, opt_silent) {
  var onError = opt_onError || function(e) {
    fatal('command failed: ' + cmd + '\n' + e);
  };
  if (!opt_silent) {
    console.log('Running: ' + cmd);
  }
  childProcess.exec(cmd, function(error, stdout, stderr) {
    if (error) {
      onError(error);
    } else {
      onSuccess(stdout.trim(), stderr.trim());
    }
  });
}

if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir);
}
process.chdir(workDir);

var cmd;
var rebase = false;
if (fs.existsSync(projectName)) {
  process.chdir(projectName);
  cmd = 'git pull --rebase';
  rebase = true;
} else {
  cmd = 'git clone ' + repository;
}
exec(cmd, function(error, stdout, stderr) {
  if (rebase) {
    process.chdir('..');
  }
  fs.readFile(projectName + '/manifest.json', function(err, data) {
    if (err) {
      fatal('could not read manifest');
    }
    var manifestDict = JSON.parse(data);
    var version = manifestDict.version;
    var re = /(\d+\.\d+)\.(\d+)/;
    var result = version.match(re);
    var version = result[1] + '.' + (parseInt(result[2]) + 1);
    console.log(version);

    manifestDict.version = version;
    fs.writeFile(projectName + '/manifest.json',
                 JSON.stringify(manifestDict, null, '  '),
                 function(err) {
      if (err) {
        fatal('could not write manifest');
      }
      process.chdir(projectName);
      exec('git commit -m "version ' + version + '" manifest.json',
           function(error, stdout, stderr) {
        delete manifestDict['key'];
        fs.writeFile('manifest.json',
                     JSON.stringify(manifestDict, null, '  '),
                     function(err) {
          if (err) {
            fatal('could not write manifest');
          }
          process.chdir('..');
          exec('zip -r ' + projectName + '-' + version + '.zip ' +
                   projectName + ' -x "*/.git/*" -x "' + projectName +
                   '/scripts/*"',
               function(error, stdout, stderr) {
                 process.chdir(projectName);
                 exec('git checkout manifest.json',
                      function(error, stdout, stderr) {
                        console.log(
                            'You can now push changes from ~/ADTBuilds/' +
                            projectName);
                      }, function(error) {
                        fatal('checkout failed');
                      });
               }, function(error) {
                 fatal('zip failed');
               });
        });
      }, function(error) {
        fatal('commit failed');
      });
    });
  });
}, function(error) {
  fatal('could not get source from the repository');
});
