
function onSignUp() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  // firebase authentication method for creating users for firebase app
  firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    alert(error.message);
  });

  // once succesful signup, user can now use app
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      alert("Successfully signed up. Redirecting to your new home page.");
      window.location = "home.html";
    }
  });
}

function onLogin() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
  .then(user => {
    window.location = "home.html";
  }).catch(error => {
    alert(error);
  });
} 

function onLogOut() {
  if (firebase.auth().currentUser !== null) {
    firebase.auth().signOut().then(function() {
      window.location = "index.html";
    }).catch(function(error) {
      alert(error.message);
    });
  } else {
    console.log("user is not logged in");
  }
}

// takes user to home page if needed, otherwise, to login page if not logged in
function onHome() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      window.location = "home.html";
    } else {
      window.location = "index.html";
    }
  });
}

// takes user to settings page if logged in and they tap settings button
function onSettings() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      window.location = "settings.html";
    } else {
      window.location = "index.html";
    }
  });
}

function changePassword() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      firebase.auth().sendPasswordResetEmail(user.email).then(function() {
        alert("Password reset instructions sent. Please check your email.");
      }).catch(function(error) {
        alert(error.message);
      });
    } 
  });
}

// uploadFile() will trigger this function when firebase is uploading
// to storage. This will store relevant meme data to the firebase database
// to help retrieve correct meme data (i.e. flattened vs nonflattened meme)
function postMessage(postText, name, meme, topText, bottomText) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // get key for post
      var newPostKey = firebase.database().ref().child("users/" + user.uid).push().key;

      // data we use to represent meme information
      // store in firebase database
      var postData = {
        storagePath: postText,
        fileName: name,
        memeFileName: meme,
        topText: topText,
        bottomText: bottomText,
        key: newPostKey
      };

      // database path for memes
      // path generated is based on user id, and post key generated above
      var updates = {};
      updates["/users/" + user.uid + "/" + newPostKey + "/"] = postData;

      // return once we have written to databse
      return firebase.database().ref().update(updates, function(error) {
        if (error) {
          alert(error.message);
        } else {
          console.log("successful write");
        }
      });        

    } else {
      console.log("error: authentication error");
    }
  });
}

// triggered when user uploads a meme. will store in firebase storage and database
function uploadFile(fileId, topText, bottomText, memeFile) {
  let user = firebase.auth().currentUser;
  if (user) {
    if (memeFile === null) {
      document.getElementById("userMemes").innerHTML = "";
    }

    // obtain file that user is using for their meme
    let file = document.getElementById(fileId).files[0];
    let metadata = {
      customMetadata: {
        'createdBy': user.email
      }
    };

    // display loading spinner
    document.getElementsByClassName("sk-circle")[0].style.display = "block";

    // concatenate '_' to end of string (before file type) to differentiate flattened vs non-flattened memes
    // also replace spaces with a '_' to avoid parsing issues
    let nameOfFile = "";
    nameOfFile = file.name.substring(0, file.name.length-4)  + "_" + file.name.substring(file.name.length-4, file.name.length);
    nameOfFile = nameOfFile.replace(/ /g, "_");

    let storagePath = "/user-memes/" + user.uid + "/" + nameOfFile;

    // firebase upload task
    let uploadTask = firebase.storage().ref().child(storagePath).put(file, metadata);

    // memeFile will be null if the user uploaded a meme (and not created it from scratch)
    let name = "";
    if (memeFile !== null) {
      name = memeFile.name.substring(0, memeFile.name.length-4) + "<" + memeFile.name.substring(memeFile.name.length-4, memeFile.name.length);
      name = name.replace(/ /g, "_");
    }

    // add file metadata to database
    postMessage(storagePath, nameOfFile, name, topText, bottomText); 

    // monitor file upload progress
    uploadTask.on("state_changed", function(current) {
      let progress = (current.bytesTransferred / current.totalBytes) * 100;
      switch(current.state) {
        case firebase.storage.TaskState.PAUSED:
          console.log("Upload is paused");
          break;
        case firebase.storage.TaskState.RUNNING:
          console.log("Upload is running");
          break;
      }
    }, function(error) {
         console.log(error.message);
    }, function() {

      // this will execute if user uploaded a meme (and not created it from scratch)
      // indicates meme succesfully saved, and redirect to home page
      if (memeFile === null) {
        alert("File successfully uploaded");
        document.getElementsByClassName("sk-circle")[0].style.display = "none";
        document.getElementById("userMemes").innerHTML = "";
        if (window.location === "home.html") {
          window.location.reload(true);
        } else {
          window.location = "home.html";
        }
        document.getElementById("memeUpload").files[0] = null;
        document.getElementById("uploadButton").style.display = "none";
        document.getElementById("uploadCancelButton").style.display = "none";
        document.getElementById("userMemes").innerHTML = "";
      }
    });

    // return if user uploaded a no scratch created meme
    if (memeFile === null) return;

    // generate path for scratch created meme
    memePath = "/nonFlattenedMemes/" + user.uid + "/" + name;
    let memeUploadTask = firebase.storage().ref().child(memePath).put(memeFile, metadata);

    // monitor file upload progress
    memeUploadTask.on("state_changed", function(current) {
      let progress = (current.bytesTransferred / current.totalBytes) * 100;
      switch(current.state) {
        case firebase.storage.TaskState.PAUSED:
          console.log("Upload is paused");
          break;
        case firebase.storage.TaskState.RUNNING:
          console.log("Upload is running");
          break;
      }
    }, function(error) {
         console.log(error.message);
    }, function() {
      // hide spinner once upload is completed
      document.getElementsByClassName("sk-circle")[0].style.display = "none";
      if (window.location === "home.html") {
        window.location.reload(true);
      } else {
        window.location = "home.html";
      }
      document.getElementById("memeUpload").files[0] = null;
      document.getElementById("uploadButton").style.display = "none";
      document.getElementById("uploadCancelButton").style.display = "none";
      document.getElementById("userMemes").innerHTML = "";
    });
  }
}

function cancelUploadFile() {
  console.log("file upload canceled");
}

// called every time user visits home page. displays all of their created memes
// will be called again when user deletes, updates, or uploads new meme
function displayUserMemes() {
  let user = firebase.auth().currentUser;
  if (user) {

    // retrieve database info for specific user
    // find their memes from storage once we get their data
    let users = firebase.database().ref("/users/" + user.uid);
    users.on("value", function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        document.getElementsByClassName("sk-circle")[0].style.display = "block";
        let data = childSnapshot.val();
        let images = null;
        let image = null;

        // memeFileName will be a string if the user has created this current meme 
        // otherwise, if it was uploaded, it will be the empty string
        // (used to help determine whether or not the meme can be edited, as memes that
        // were uploaded from users cannot have their text directly edited)
        if (data.memeFileName.length > 0) {
          images = firebase.storage().ref().child("/nonFlattenedMemes/" + user.uid);
          image = images.child(data.memeFileName);
          image.getDownloadURL().then(function(url) {
            // displays the meme on the user homepage
            downloadMeme(url, data.memeFileName);
          }).catch(function(error) {
            document.getElementsByClassName("sk-circle")[0].style.display = "none";
            console.log(error.message);
          })
        } else {
            // called when user has only uploaded this meme (not created from scratch)
            let images = firebase.storage().ref().child("/user-memes/" + user.uid);
            image = images.child(data.fileName);
            image.getDownloadURL().then(function(url) {
              downloadMeme(url, data.fileName);
            }).catch(function(error) {
              console.log(error.message);
            })
          }
      })
    })
  }
}

// handler for editing memes
function editMeme(file) {
  window.localStorage.setItem("memeToEdit", file);
  window.location = "edit.html";
}

// source: https://github.com/GeekLaunch/meme-generator
// inspiration for drawing meme onto html canvas drawn from above source (with video tutorial on canvas too)
// handles drawing uploaded image from user onto HTML canvas
// takes the file input and converts file into image to draw text onto in canvas
function drawEdits(meme, canvasID, topTextID, bottomTextID, uploadButtonID) {
  // set canvas width and height to that of meme width and height
  let canvas = document.getElementById(canvasID);
  canvas.width = meme.width;
  canvas.height = meme.height;

  // return the context for the canvas we are to draw on
  // the html canvas context is a mechanism that allows us to draw 
  // content onto the html canvas
  let context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(meme, 0, 0);

  // determine font properties for meme text
  let fontSize = canvas.width / 10;
  context.font = fontSize + 'px Impact';
  context.fillStyle = "white";
  context.strokeStyle = "black";
  context.lineWidth = fontSize / 10;
  context.textAlign = "center";

  // grab meme text from text areas to draw onto canvas (display in all upper case)
  let topText = document.getElementById(topTextID).value.toUpperCase();
  let bottomText = document.getElementById(bottomTextID).value.toUpperCase();

  // set baseline (where the text is to be displayed on canvas) for both top, and bottom text
  context.textBaseline = "top";
  context.fillText(topText, canvas.width / 2, 0, canvas.width);
  context.strokeText(topText, canvas.width / 2, 0, canvas.width);

  // same as above but for bottom
  context.textBaseline = "bottom";
  context.fillText(bottomText, canvas.width / 2, canvas.height, canvas.width);
  context.strokeText(bottomText, canvas.width / 2, canvas.height, canvas.width);

  // show upload button once we've drawn meme for user
  document.getElementById(uploadButtonID).style.display = "block";
}

// shares meme via facebook api
function shareMeme(file) {
  // file parameter is the id of the meme we want to share
  // ^ separates the meme share id and the file name we wish to share
  window.localStorage.setItem("memeToShare", file);
  let memeToShare = file.split("^")[1];
  firebase.auth().onAuthStateChanged(function(user) {
    let users = firebase.database().ref("/users/" + user.uid);
    // find the meme we want to share from the user's meme collection
    users.on("value", function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        let data = childSnapshot.val();
        let images = null;
        let image = null;

        // as explained in uploadFile(). this logic determines whether or not the
        // meme was created from scratch, or was uploaded from the user
        if (data.memeFileName.length > 0 && data.memeFileName === memeToShare) {
          images = firebase.storage().ref().child("/nonFlattenedMemes/" + user.uid);
          image = images.child(data.memeFileName);
          image.getDownloadURL().then(function(url) {
            window.localStorage.setItem("memeUrl", url);
            window.location = "share.html";
          }).catch(function(error) {
            console.log(error.message);
          })
        } else if (data.fileName === memeToShare) {
        let images = firebase.storage().ref().child("/user-memes/" + user.uid);
          image = images.child(data.fileName);
          image.getDownloadURL().then(function(url) {
            window.localStorage.setItem("memeUrl", url);
            window.location = "share.html";
          }).catch(function(error) {
            console.log(error.message);
          })
        }
      })
    })
  });
}

// displays meme on user home page
function downloadMeme(url, fileName) {
  let meme = `<img id=meme${fileName} src=${url}>`;

  // generate HTML for user's memes to display meme and respective share, edit, delete buttons
  // along with creating unique ids for them
  let shareId = `shareMeme^${fileName}`;
  let share = `shareMeme("${shareId}")`;
  let shareButton = `<button class="memeButtons" id=${shareId} onclick=${share}>Share</button>`;

  let editId = `editMeme^${fileName}`;
  let edit = `editMeme("${editId}")`;
  let editButton = `<button class="memeButtons" id=${editId} onclick=${edit}>Edit</button>`;

  let deleteId = `deleteMeme^${fileName}`;
  console.log(deleteId.split("^"));
  console.log("next");
  let remove = `deleteMeme("${deleteId}")`;
  let removeButton = `<button class="memeButtons" id=${deleteId} onclick=${remove}>Delete</button>`;

  document.getElementById("userMemes").innerHTML += meme + `<br><br>`; 
  document.getElementById("userMemes").innerHTML += shareButton;

  // only add the edit button if this meme was created by scratch
  // memes not created by scratch will have a '_' before the ".jpg", ".png" file type extension
  if (fileName.charAt(fileName.length-5) !== '_') {
    document.getElementById("userMemes").innerHTML += editButton;
  }

  document.getElementById("userMemes").innerHTML += removeButton + `<br><br><hr>`;

  document.getElementById(`meme${fileName}`).style.height = '500px';
  document.getElementById(`meme${fileName}`).style.width = '500px';

  document.getElementsByClassName("sk-circle")[0].style.display = "none";
}

function deleteMeme(id) {
  let user = firebase.auth().currentUser;
  let idSplit = id.split("^");
  let file = idSplit[1];

  let nonFlattenedFile = "";

  // determine whether or not we need to delete a meme created from scratch
  // or a meme that was uploaded ('<' indicates meme from scratch, '_' indicates meme from upload)
  if (file.charAt(file.length-5) === '_') {
    nonFlattenedFile = file.substring(0, file.length-4) + "<" + file.substring(file.length-4, file.length);
    nonFlattenedFile = nonFlattenedFile.replace(/_/g, "<");
  } else {
    nonFlattenedFile = file;
    file = file.replace(/</g, "_");
  }

  // find meme post key for the meme we wish to delete
  // post key used to find storage path
  let newPostKey = undefined;
  let users = firebase.database().ref("/users/" + user.uid);
  users.on("value", function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      let data = childSnapshot.val();
      let images = firebase.storage().ref().child("/user-memes/" + user.uid);
      let image = images.child(data.fileName);
      if (data.fileName === file) {
        newPostKey = data.key;
        return;
      }
    })
  });

  let storagePath = "/user-memes/" + user.uid + "/" + file; 
  let nonFlattenedPath = "/nonFlattenedMemes/" + user.uid + "/" + nonFlattenedFile;

  firebase.storage().ref().child(storagePath).delete().then(function() {
    console.log("flattened deleted");
  }).catch(function(error) {
    console.log(error.message);
  });

  firebase.storage().ref().child(nonFlattenedPath).delete().then(function() {
    console.log("nonFlattened deleted");
  }).catch(function(error) {
    console.log("ignore this");
  });

  // remove information from database
  let updates = {};
  let key = "/users/" + user.uid + "/" + newPostKey + "/";
  updates[key] = null;

  firebase.database().ref().update(updates, function(error) {
    if (error) {
      alert(error.message);
    } else {
      console.log("successful deleted database info");
      document.getElementById("userMemes").innerHTML = "";
      window.location.reload(true);
    }
  });        
}
