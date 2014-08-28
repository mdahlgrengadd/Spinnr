Weight = new Meteor.Collection("Weight", {
    schema: {
        weight: {
            type: Number,
                  decimal: true,
            label: "Weight (Kg)",
            min: 0
        },
        date: {
            type: Date,
            label: "Last date this book was checked out",
            optional: true,
            autoValue: function() { return this.value || new Date(); },

        }
    }
});


if (Meteor.isServer) {
  Meteor.publish("Weight", function() {
    return Weight.find({}, {sort: {date: -1}});
  });

//Allow client removals
  Weight.allow({
    'remove': function (userId,doc) {
      /* user and doc checks ,
      return true to allow insert */
      return true; 
    }
  });

Weight.remove({});


}//isServer
if (Meteor.isServer) {
var kcalDailyNeed = 1772.9*1.2//25*70;
var kcalPerKg = 7500;
var estimatedDailyIntake = 1600;
var kcalDeficit = kcalDailyNeed - estimatedDailyIntake;
var startWeight = 81.5;


var date = new Date('2014','05','01');

var arrayLength = 180;
for (var days = 0; days < arrayLength; days++) {
    var estimate = startWeight - (days * kcalDeficit) / kcalPerKg;


var newdate = new Date(date);
newdate.setDate(newdate.getDate() + days);
var nd = new Date(newdate);//moment().day(-7+days).toDate();

//Weight.insert({weight: Math.round(estimate * 100) / 100, date: nd}, function(error, result) {
  //The insert will fail, error will be set,
  //and result will be undefined or false because "copies" is required.
  //
  //The list of errors is available on `error.invalidKeys` or by calling Weight.simpleSchema().namedContext().invalidKeys()
  //alert(error.message);
//});

}
}


