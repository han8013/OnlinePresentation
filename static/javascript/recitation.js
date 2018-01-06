$(document).ready(function () {
    $('.modal').modal({
        dismissible: true, // Modal can be dismissed by clicking outside of the modal
        opacity: .5, // Opacity of modal background
        inDuration: 300, // Transition in duration
        outDuration: 200, // Transition out duration
        startingTop: '4%', // Starting top style attribute
        endingTop: '10%' // Ending top style attribute
    });
    $('ul.tabs').tabs();
});

function initRecModal(classId) {
    $(".recitation-name").val('');
    initDateForRec();
    $(".delete-recitation-btn").hide();
    $(".save-recitaiton").attr("onclick", "addRecitation('" + classId + "')");
}

function validateRecitationModalInput() {
    if ($(".recitation-name").val() != '' && $("#rec-date-alert").is(":hidden")) {
        $('.save-recitaiton').removeAttr('disabled');
    } else {
        $(".save-recitaiton").attr("disabled", true);
    }
}

function initDateForRec() {
    $(".save-recitaiton").attr("disabled", true);
    $('#rec-date-alert').hide();
    var startDate = new Date();
    var endDate = new Date();
    var today = new Date();
    var currentMonth = today.getMonth() + 1;
    var t = today.getFullYear() + "-" + currentMonth + "-" + today.getDate();
    $('#rec-date-start').data({date: t}).datepicker('update');
    $('#rec-date-start-display').text($('#rec-date-start').data('date'));
    $('#rec-date-end').data({date: t}).datepicker('update');
    $('#rec-date-end-display').text($('#rec-date-end').data('date'));
    checkRecitationDate(startDate, endDate);
}

function searchRec() {
  $('.recitation').show();
  var name = $("#search-rec").val();
  $('.recitation').each(function(i, element) {
    if(!element.innerText.includes(name)) {
      $(this).hide();
    }
  });
}

function checkRecitationDate(startDate, endDate) {
    $('#rec-date-start')
        .datepicker()
        .on('changeDate', function (ev) {
            if (ev.date.valueOf() > endDate.valueOf()) {
                $('#rec-date-alert').show().find('strong').text('The start date must be before the end date.');
            } else {
                $('#rec-date-alert').hide();
                startDate = new Date(ev.date);
                $('#rec-date-start-display').text($('#rec-date-start').data('date'));
            }
            $('#rec-date-start').datepicker('hide');
            validateRecitationModalInput();
        });
    $('#rec-date-end')
        .datepicker()
        .on('changeDate', function (ev) {
            if (ev.date.valueOf() < startDate.valueOf()) {
                $('#rec-date-alert').show().find('strong').text('The end date must be after the start date.');
            } else {
                $('#rec-date-alert').hide();
                endDate = new Date(ev.date);
                $('#rec-date-end-display').text($('#rec-date-end').data('date'));
            }
            $('#rec-date-end').datepicker('hide');
            validateRecitationModalInput();
        });
}

function viewRecitationInfo(current_recitation_id, currentClassId) {
    $("#" + current_recitation_id).modal('close');
    $("#recitation-detail label").addClass("active");
    $.ajax({
        url: '/ajax/get-recitation-info',
        type: 'post',
        data: JSON.stringify({recitationId: current_recitation_id}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (data) {
        if (data.result === true) {
            $(".recitation-name").val(data.recitation.name);
            $('#rec-date-alert').hide();
            $(".save-recitaiton").attr("disabled", true);
            var startDate = new Date(data.recitation.startDate);
            var endDate = new Date(data.recitation.endDate);
            var startMonth = startDate.getMonth() + 1;
            var endMonth = endDate.getMonth() + 1;
            var start = startDate.getFullYear() + "-" + startMonth + "-" + startDate.getDate();
            var end = endDate.getFullYear() + "-" + endMonth + "-" + endDate.getDate();
            $('#rec-date-start').data({date: start}).datepicker('update');
            $('#rec-date-start-display').text($('#rec-date-start').data('date'));
            $('#rec-date-end').data({date: end}).datepicker('update');
            $('#rec-date-end-display').text($('#rec-date-end').data('date'));
            checkRecitationDate(startDate, endDate);

            $(".save-recitaiton").attr("onclick", "editRecitation('" + current_recitation_id + "','" + currentClassId + "')");
        } else {
            console.error(data.reason);
        }
    }).fail(function (err) {
        console.error(err);
    });
}

function deleteRecitation(recID, classId) {
    $.ajax({
        url: '/ajax/delete-recitation',
        type: 'post',
        data: JSON.stringify({recitationId: recID}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (data) {
        $("#" + recID).modal('close');
        location.reload();
    }).fail(function (err) {
        console.error(err);
    });
}

function addRecitation(currentClassId) {
    var name = $(".recitation-name").val();
    //var startDate = $('#rec-date-start-display').text();
    //var endDate = $('#rec-date-end-display').text();
    var add_button = $('#save-recitation');
    add_button.html("adding...");
    add_button.attr('disabled',true);

    $.ajax({
        type: "POST",
        url: "/ajax/add-recitation",
        data: JSON.stringify({
            class: currentClassId,
            name: name,
            startDate: new Date(),
            endDate: new Date()
        }),
        success: function (data) {
            if (data.result === true) {
                $('#recitation-detail').modal('close');
                location.reload();
                add_button.html("done");
            } else {
                console.error(data.reason);
            }
        },
        error: function (ts) {
            console.log(ts.responseText);
            add_button.html("try again");
            add_button.removeAttr('disabled');
        },
        dataType: "json",
        contentType: "application/json"
    });
}

function editRecitation(current_recitation_id, currentClassId) {
    var name = $(".recitation-name").val();
    var startDate = $("#rec-date-start-display").text();
    var endDate = $("#rec-date-end-display").text();

    $.ajax({
        type: "POST",
        url: "/ajax/edit-recitation",
        data: JSON.stringify({
            recitationId: current_recitation_id,
            name: name,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        }),
        success: function (data) {
            if (data.result === true) {
                $('#recitation-detail').modal('close');
                location.reload();
            } else {
                console.error(data.reason);
            }
        },
        error: function (ts) {
            console.log(ts.responseText);
        },
        dataType: "json",
        contentType: "application/json"
    });
}

function addSlide() {
    var count = Math.floor(Math.random() * 30);
    $(".tabs").append('<li class="tab"><a href="#tab-' + count + '" tab-id=tab-"'+count+'">New Slide<i class="material-icons" onclick="deleteSlide(this)">clear</i></a></li>');
    var newSlideTab = $('<div class="list-group"></div>');
    var tabBody = $('<div id="tab-'+count+'" class="tab-body"></div>');
    $(".slides-workarea").append(tabBody);
    tabBody.append(newSlideTab);
    Sortable.create(newSlideTab[0], {
        handle: '.move-file',
        animation: 150
    });
    $(".tabs").tabs('select_tab', "tab-"+count);
}

function deleteSlide(element) {
  var x = $(element).parent();
  var id = $(element).parent().attr('href');
  $(id).remove();
  $(element).parent().parent().remove();
}
