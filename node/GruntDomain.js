/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, log, require, exports, process */


(function () {
    "use strict";
    
    var os = require("os");
	var path = require('path');
	
	var domain;
	var cmd = null;
	var isWin = /^win/.test(process.platform);
	var isLinux  = /^linux/.test(process.platform);
	
	
	
	require.uncache = function (moduleName) {
		// Run over the cache looking for the files
		// loaded by the specified module name
		require.searchCache(moduleName, function (mod) {
			delete require.cache[mod.id];
		});
	}


	require.searchCache = function (moduleName, callback) {
		// Resolve the module identified by the specified name
		var mod = require.resolve(moduleName);

		// Check if the module has been resolved and found within
		// the cache
		if (mod && ((mod = require.cache[mod]) !== undefined)) {
			// Recursively go over the results
			(function run(mod) {
				// Go over each of the module's children and
				// run over it
				mod.children.forEach(function (child) {
					run(child);
				});

				// Call the specified callback providing the
				// found module
				callback(mod);
			})(mod);
		}
	}

        
    function getTasks(path) {
		
		//reload grunt module 
		require.uncache('grunt');
		var grunt = require("grunt");
		
		grunt.option('gruntfile', path + "Gruntfile.js");
		grunt.task.init([]);
		
        var tasks = [];
        for (var key in grunt.task._tasks) 
        {
            var task = {};
            task.name = key;
            task.isAlias = (grunt.task._tasks[key].info && grunt.task._tasks[key].info.indexOf("Alias for ") > -1);
            
            tasks.push(task);
        }

		return tasks.sort(function(a, b)
            {
                if((a.isAlias && b.isAlias) || (!a.isAlias && !b.isAlias)) 
                {
                    return a.name === b.name ? 0 : (a.name < b.name ? -1 : 1);
                } 
                else if(a.isAlias) 
                {
                    return -1;
                } 
                else 
                {
                    return 1;
                }
           });
    }
	
	
	// Just fooling around 
	function runTaskDirect(task, path, callback) {
        //reload grunt module 
		require.uncache('grunt');
		var grunt = require("grunt");
        grunt.option('gruntfile', path + "Gruntfile.js");
		grunt.option('verbose', "true");
		grunt.task.init([]);
        grunt.task.run(task);
		grunt.task.start();
    }
	
	//End an already running command
	function killTask() {
		if (cmd !== null) {
			if (!isWin) {
				cmd.kill();
			} else {
				var cp = require('child_process');
				cp.exec('taskkill /PID ' + cmd.pid + ' /T /F');
				cmd = null;
			}
		}
	}
	
	
	function runTask(task, path, modulePath, callback) {
		
		killTask();
		// Execute grunt command
		var exec = require('child_process').exec;
		process.chdir(path);
		if (!isLinux) {
			//var spawn = require('child_process').spawn;
			//cmd =  spawn(modulePath +"/node/node_modules/.bin/grunt.cmd", ['--no-color', task]);
			
			cmd = exec(modulePath +"/node/node_modules/.bin/grunt --no-color " + task, function(error, stdout, stderr){
				if( callback) {
					if (error) {
						callback(stderr);
					} else {
						callback(false, stdout);
					}
				}
			});
			
			cmd.stderr.on('data', function (data) {
				//callback(data.toString());
				console.log(data.toString());
				domain.emitEvent("grunt", "change",data.toString());
			});
			
			cmd.stdout.on('data', function (data) {
				//callback(false, data.toString());
				console.log(data.toString());
				domain.emitEvent("grunt","change",data.toString());
			});
			cmd.on('error', function() { console.log(arguments); });

		
		} else {
			cmd = exec("echo '" + modulePath + "/node/node_modules/.bin/grunt --no-color " + task + "' | bash --login",  function(error, stdout, stderr){
				if( callback) {
					if (error) {
						callback(stderr);
					} else {
						callback(stdout);
					}
				}
			});
			
			
			cmd.stderr.on('data', function (data) {
				//callback(data.toString());
				console.log(data.toString());
				domain.emitEvent("grunt", "change",data.toString());
			});
			
			cmd.stdout.on('data', function (data) {
				//callback(false, data.toString());
				console.log(data.toString());
				domain.emitEvent("grunt","change",data.toString());
			});
			cmd.on('error', function() { console.log(arguments); });
			
			
		}
    }
    
 
    function init(domainManager) {
        if (!domainManager.hasDomain("grunt")) {
            domainManager.registerDomain("grunt", {major: 0, minor: 1});
        }
		 
		domain = domainManager;
		
        domainManager.registerCommand(
            "grunt",
            "getTasks",
            getTasks,
            false
        );
		
		domainManager.registerCommand(
            "grunt",
            "killTask",
            killTask,
            false
        );
		
		domainManager.registerCommand(
            "grunt",
            "runTask",
            runTask,
            true
        );
		
		
		domainManager.registerEvent(
			"grunt",
			"change",
			[
				{name: "data", type: "object"}
			
			]
		);
    }
	
    
    exports.init = init;
    
}());