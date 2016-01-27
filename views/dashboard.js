function endpointWithFilters(){
  var endpoint = '/showall?';
  if($('#date_from').val()){
    endpoint = endpoint + "from=" + $('#date_from').val();
  }
  if($('#date_to').val()){
    endpoint = endpoint + "to=" + $('#date_to').val();
  }
  return endpoint;
}

$(document).ready(function(){
  $('#date_from').datepicker({format: "dd/mm/yyyy"});
  $('#date_to').datepicker({format: "dd/mm/yyyy"});

  $('#summary').on('click', function(evt){
    $.get('/summary', function(data, textStatus){
      $('#content').html(data);
    })
    return false;
  });

  $('#showall').on('click', function(evt){
    $.get('/showall', function(data, textStatus){
      $('#content').html(data);
      $('#date_from').val("");
      $('#date_to').val("");
    })
    return false;
  });

  $('#addentry').on('click', function(evt){
    $.get('/entry', function(data, textStatus){
      $('#content').html(data);
    })
    return false;
  });

  $('#applyfilter').on('click', function(evt){
    var endpoint = endpointWithFilters();
    $.get(endpoint, function(data, textStatus){
      $('#content').html(data);
    })
    return false;
  });


  $('#content').on('click', '.editentry', function(evt){
    var that = $(this);
    var eid = that.attr('data-eid');
    $.get('/entry?eid=' + eid, function(data, textStatus){
      $('#content').html(data);
    })
    return false;
  });

  $('#content').on('click', '.deleteentry', function(evt){
    var that = $(this);
    var eid = that.attr('data-eid');
    $.get('/delete_entry?eid=' + eid, function(data, textStatus){
      if (data.status === "ok"){
        var endpoint = endpointWithFilters();
        $.get(endpoint, function(data){
          $('#content').html(data);
        });
      }
      else{
        alert(data.message);
      }
    })
    return false;
  });

  $('#content').on('click', '#updateentry', function(evt){
    var that = $(this);
    var params = {
      date: $('#content').find('input[name="date"]').val(),
      time: $('#content').find('input[name="time"]').val(),
      description: $('#content').find('input[name="description"]').val(),
      amount: $('#content').find('input[name="amount"]').val(),
      comment: $('#content').find('input[name="comment"]').val(),
    }
    console.log(params);
    var endpoint = '/entry';
    if(that.attr('data-eid')){
      endpoint = endpoint + '?eid=' + that.attr('data-eid');
    }
    $.post(endpoint, params, function(data, textStatus){
      if(data.status === 'ok'){
        $.get('/showall', function(data, textStatus){
          $('#content').html(data);
        });
      }
      else{
        alert(data.message);
      }
    });
    return false;
  });
});


