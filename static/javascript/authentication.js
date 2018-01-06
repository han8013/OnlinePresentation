 function onLoad() {
     gapi.load('auth2', function () {
         gapi.auth2.init();
     });
 }

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      $.ajax({
          url: '/ajax/logout',
          type: 'post'
      }).done(function (data) {
          window.location.href = window.location.origin;
      }).fail(function (err) {
          console.error(err);
      });
    });
}

function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    var name = profile.getName();
    var id_token = googleUser.getAuthResponse().id_token;
    var id = profile.getId();

    var checkUser = $.ajax({
        type: "POST",
        url: "/ajax/login",
        data: JSON.stringify({IDToken: id_token}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    });
    checkUser.done(function (data) {
        if (!data.hasRole) {
            prestartDialog = vex.dialog.open({
                message: 'What is your role?',
                buttons: [{
                    text: 'Student', type: 'button', className: 'vex-dialog-button-primary',
                    click: function () {
                        $.ajax({
                            type: "POST",
                            url: "/ajax/sign-up",
                            contentType: "application/json",
                            data: JSON.stringify({
                                role: 'Student'
                            }),
                            success: function (data) {
                                if (data.result) {
                                    window.location.href = window.location.origin + "/course";
                                } else {
                                    vex.dialog.alert(data.reason);
                                }
                            },
                            error: function (ts) {
                                console.log(ts.responseText);
                            }
                        });
                    }
                }, {
                    text: 'Instructor', type: 'button', className: 'vex-dialog-button-primary',
                    click: function () {
                        $.ajax({
                            type: "POST",
                            url: "/ajax/sign-up",
                            contentType: "application/json",
                            data: JSON.stringify({
                                role: 'Instructor'
                            }),
                            success: function (data) {
                                if (data.result) {
                                    window.location.href = window.location.origin + "/course";
                                } else {
                                    vex.dialog.alert(data.reason);
                                }
                            },
                            error: function (ts) {
                                console.log(ts.responseText);
                            }
                        });
                    }
                }],
                overlayClosesOnClick: false,
            });
        } else {
            window.location.href = window.location.origin + "/course";
        }
    });
}
