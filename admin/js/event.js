
var eventHandler = {
  publish : function(orders){

    var orders, refreshInterval;

    if (!!window.EventSource) {

      source = new EventSource("/stream");
      source.addEventListener("open", function(event) {
        console.log("Successfully Connected. State: %s", event.target.readyState);
        setTimeout(function(){
          console.log('Attempting to reload. Status: ', source.readyState === EventSource.CLOSED);
          if(source.readyState === EventSource.CLOSED){
            console.log('Actually reloading the page.');
            location.reload();
          }
        }, 10000);

      }, false);

      source.addEventListener("message", function(event) {
        try {
          order = JSON.parse(event.data);

        }
        catch (e) {
          console.log('Received an invalid json object.');
          return;
        }

        if(order.action === 'create'){
          var newOrder = document.createElement("LI");
          newOrder.id = order.id;
          newOrder.appendChild(document.createTextNode(['Name: ', order.name,  ' Quantity: ', order.quantity].join('')));
          //orders.appendChild(newOrder);
          orders.insertBefore(newOrder, orders.firstChild);
        }else{
          var itemToRemove = document.getElementById(order.id);
          if(itemToRemove){
            itemToRemove.parentElement.removeChild(itemToRemove);
          }
        }

      }, false);

      source.addEventListener("error", function(event) {
        if (event.target.readyState === EventSource.CLOSED) {
          source.close();
          console.log( "Connection closed!");
        } else if (event.target.readyState === EventSource.CONNECTING) {
          console.log( "Connection closed. Attempting to reconnect!");
        } else {
          console.log( "Connection closed. Unknown error!");
        }
      });

    } else {
      console.log('Server Sent Events is not supported.');
    }

  }
}

 window.addEventListener("load", function() {
  var orders = document.getElementById("orders");
   eventHandler.publish(orders);
});
