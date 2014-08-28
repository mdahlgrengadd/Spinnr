function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

Food = new Meteor.Collection("Foods", {
    schema: {
        name: {
            type: String,
            label: "Name",
            min: 0
        },
            calories: {
            type: Number,
            label: "Calories (kcal)",
            min: 0
        },

        date: {
            type: Date,
            label: "Last date this Food was checked out",
            optional: true,
            autoValue: function() { return this.value || new Date(); },

        }
    }
});


if (Meteor.isServer) {
  Meteor.publish("Foods", function() {
    return Food.find({}, {sort: {date: -1}});
  });

//Allow client removals
  Food.allow({
    'remove': function (userId,doc) {
      /* user and doc checks ,
      return true to allow insert */
      return true; 
    }
  });

Food.remove({});

}

if (Meteor.isServer) {

var date = new Date('2014','05','01');
var arrayLength = 180;
for (var days = 0; days < arrayLength; days++) {
  var estimatedDailyIntake = randomIntFromInterval(600,3500);//1600;
    //var estimate = startWeight - (days * kcalDeficit) / kcalPerKg;


var newdate = new Date(date);
newdate.setDate(newdate.getDate() + days);
var nd = new Date(newdate);//moment().day(-7+days).toDate();

Food.insert({name: "DailyEstimate", calories: estimatedDailyIntake, date: nd}, function(error, result) {
  //The insert will fail, error will be set,
  //and result will be undefined or false because "copies" is required.
  //
  //The list of errors is available on `error.invalidKeys` or by calling Foods.simpleSchema().namedContext().invalidKeys()
  //console.log(error.message);
});

}
}
