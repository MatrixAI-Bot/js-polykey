const kbpgp = require('kbpgp')

kbpgp.KeyManager.generate_rsa({ userid : "Bo Jackson <user@example.com>" }, function(err: Error, charlie: any) {
    charlie.sign({}, function(err: Error) {
      if (err) {
        throw Error
      }
      console.log("done!");
    });
 });