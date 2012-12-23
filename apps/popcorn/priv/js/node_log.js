var isVisible = false;
var clickedAway = false;

$(document).ready(function() {
  updateHistoryState = function() {
    var cleanUrl = History.getState().cleanUrl;
    var params = [];
    if (appliedFilters['node_names'].length > 0) {
      params.push('nodes=' + encodeURIComponent(appliedFilters['node_names']));
    }
    if (appliedFilters['severities'].length > 0) {
      params.push('severities=' + appliedFilters['severities']);
    }

    History.pushState({}, '', '?' + params.join('&'));
  };

  $('.filter-severity').click(function(e) {
    var severitiesOn = [];
    $.each($('.filter-severity'), function(k, v) {
      if ($(v).prop('checked')) {
        severitiesOn.push(parseInt($(this).attr('data-val')));
      }
    });

    appliedFilters['severities'] = severitiesOn;
    updateHistoryState();

    $.ajax({type:'POST',url:'/log/stream/' + streamId,
            data:'severities=' + severitiesOn,
            success:function() { },
            error:function() {
              alert('Unable to update filter');
            }});
  });

  $('.icon-remove').click(function(e) {
    e.preventDefault();
    $('#log-messages tr:gt(0)').remove();
  });

  $('.icon-pause').click(function(e) {
    e.preventDefault();
    var data = 'stream_id=' + encodeURIComponent(streamId);
    $.ajax({type:'POST',url:'/log/stream/pause',data:data,
            success:function(data,textStatus,xhr) {
              if (data['is_paused']) {
                $('#log-pause').removeClass('icon-pause').addClass('icon-play');
                $('#log-messages tbody').prepend($('<tr />')
                                                 .append($('<td />').attr('colspan', '4').css('text-align', 'center')
                                                         .html('Paused...')));
              } else {
                $('#log-pause').removeClass('icon-play').addClass('icon-pause');
                $('#log-messages tbody').prepend($('<tr />')
                                                 .append($('<td />').attr('colspan', '4').css('text-align', 'center')
                                                         .html('Resumed')));
              }
            },
            error:function(xhr,textStatus) {
              alert('Unable to toggle pause state');
            }});
  });

  $('.close-popover').live('click', function() {
    $('.show-more').popover('hide');
  });

  $('.show-more').popover({html: true, trigger: 'manual'})
                 .click(function(e) {
                     $('.show-more').popover('hide');
                     $(this).popover('show');
                     e.preventDefault();
                 });

  // todo: consider making this cleaner and more maintainable... jquery's dom builder style maybe?
  var timestampPopoverContent = '<label class="radio timestamp-radio-label">' +
                                  '<input type="radio" name="timestamp-radio" value="current" checked></input>' +
                                  'Current Stream' +
                                '</label>' +
                                '<label class="radio timestamp-radio-label">' +
                                  '<input type="radio" name="timestamp-radio" value="previous"></input>' +
                                  'Earlier' +
                                  '<div id="timespan-absolute" style="display:none;">' +
                                    '<span class="timestamp-description">From</span>' +
                                    '<div class="input-append date" id="absolute-date-start" data-date="12-02-2012" data-date-format="dd-mm-yyyy">' +
                                      '<span class="add-on"><i class="icon-th"></i></span>' +
                                      '<input type="text" value="12-02-2012" readonly style="width:145px;">' +
                                    '</div>' +
                                    '<div class="input-append bootstrap-timepicker-component" id="absolute-time-start">' +
                                      '<span class="add-on"><i class="icon-time"></i></span>' +
                                      '<input type="text" class="timepicker-default input-small" readonly>' +
                                    '</div>' +
                                    '<span class="timestamp-description">To</span>' +
                                    '<div class="input-append date" id="absolute-date-end" data-date="12-02-2012" data-date-format="dd-mm-yyyy">' +
                                      '<span class="add-on"><i class="icon-th"></i></span>' +
                                      '<input type="text" value="12-02-2012" readonly style="width:145px;">' +
                                    '</div>' +
                                    '<div class="input-append bootstrap-timepicker-component" id="absolute-time-end">' +
                                      '<span class="add-on"><i class="icon-time"></i></span>' +
                                      '<input type="text" class="timepicker-default input-small" readonly>' +
                                    '</div>' +
                                  '</div>' +
                                  '<div class="timestamp-change"><a href="#" class="btn btn-mini" id="apply-time">apply</a></div>' +
                                '</label>';

  $('#log-timestamp').popover({html: true,
                               trigger: 'click',
                               title: 'Message Timestamp<div style="float:right;"><button class="close" id="close-timestamp">&times;</button></div>',
                               placement: 'bottom',
                               content: timestampPopoverContent});

  $('#log-timestamp').click(function(e) {
    $('#absolute-date-start').datepicker();
    $('#absolute-date-end').datepicker();
    $('#absolute-time-start').timepicker();
    $('#absolute-time-end').timepicker();
    e.preventDefault();
  });

  $('#close-timestamp').live('click', function(e) {
    $('#log-timestamp').popover('hide');
    e.preventDefault();
  });

  $('#apply-time').live('click', function(e) {
    e.preventDefault();
    if ($('input[name=timestamp-radio]:checked').val() == 'current') {
      $.ajax({type:'POST',url:'/log/stream/' + streamId,
              data:'time_filter_type=stream',
              success:function() { },
              error:function() {
                alert('Unable to update time filter');
              }});
    } else if ($('input[name=timestamp-radio]:checked').val() == 'previous') {
      $.ajax({type:'POST',url:'/log/stream/' + streamId,
              data:'time_filter_type=previous',
              success:function() { },
              error:function() {
                alert('Unable to update time filter');
              }});
    }

  });

  $('input[name=timestamp-radio]').live('change', function() {
    if ($(this).val() == 'previous') {
      $('#timespan-absolute').slideDown();
      $('#timespan-relative').slideUp();
    } else if($(this).val() == 'current') {
      $('#timespan-relative').slideDown();
      $('#timespan-absolute').slideUp();
    }
  });

  // select the default filters
  for (appliedFilter in appliedFilters) {
    var values = appliedFilters[appliedFilter];

    if (appliedFilter === 'node_names') {
      for (var i = 0; i < values.length; i++) {
        var value = values[i];
        $('.filter-node[data-val=\''+value+'\']').prop('checked', true);
      }
    } else if (appliedFilter === 'severities') {
      for (var i = 0; i < values.length; i++) {
        var value = values[i];
        $('.filter-severity[data-val=\''+value+'\']').prop('checked', true);
      }
    }
  }

  executeCommand = function(command_payload) {
    if (command_payload['name'] == 'clear') {
      $('#log-messages tr:gt(0)').remove();
    } else {
      console.log('Unrecognized command: ' + command);
    }
  },

  showNewLogMessage = function(log_message) {
    var row = $('<tr />');
    var cell = $('<td />').css('padding-right', '12px');
    var more = $('<a />').attr('href', '#')
                          .attr('rel', 'popover')
                          .attr('data-placement', 'bottom')
                          .attr('data-html', true)
                          .attr('data-content', log_message.find_more_html)
                          .attr('data-original-title', 'Find Similar<div style="float:right;"><button class="close close-popover">&times;</button></div>')
                          .addClass('btn').addClass('btn-mini').addClass('show-more')
                          .html('...');
    more.popover({html: true, trigger: 'manual'})
                .click(function(e) {
                  $('.show-more').popover('hide');
                  $(this).popover('show');
                  e.preventDefault();
                });
    cell.append(more);
    row.append(cell);
    row.append($('<td />').html(log_message.time));
    row.append($('<td />').html(log_message.message_severity));
    row.append($('<td />').html(log_message.message));

    $('#log-messages tbody').prepend(row);

    // truncate the table to 500 rows // TODO make this less static
    while ($('#log-messages tr').length > 500) {
      $('#log-messages tr:last').remove();
    }
  }
});


