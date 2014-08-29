# Spinnr

This is a start on making a soundcloud mixer app on meteor. It uses "Wavesurfer" for the sample view.
Based on the meteor-boilerplate project. Accounts have been removed for now, maybe added later. 




## More info from the meteor-boilderplate project...
# File structure

We have a common file structure we use across all of our meteorjs apps. The structure keeps view-dependent files together (`.html`, `.less`, `.coffee`).

```
.meteor
client

  ├── compatibility
  ├── router
  └── stylesheets
    └── lib
      ├── bootstrap.css
      └── font-awesome.css
    ├── global.less
    ├── mixins.less
    └── variables.less
  └── views
    └── dashboard
      ├── dashboard.html
      └── dashboard.less
    └── home
      ├── home.html
      ├── home.less
      └── home.coffee
    ├── footer.html
    ├── header.html
    ├── index.html
    └── loading.html
collections
  └── user.coffee
packages
public
  ├── fonts
  └── favicon.ico

```

## Responsive LESS Variables

Includes 4 LESS variables to make responsive design super easy. Each variable (`xs`, `sm`, `md`, `lg`) coincides with [Bootstrap media queries](http://getbootstrap.com/css/#responsive-utilities).

```SCSS

h1 {
  font-size: 24px;

  @media @lg {
    font-size: 36px;
  }
}

```

## Search Engine Optimization

Search engines rely on `<title>` and `<meta>` tags to read page titles and descriptions. You can specify these for each page in your app by including the following in the corresponding page's `.coffee` file. (Sample included in home.coffee)

```CoffeeScript

Tempate.home.rendered = ->

  document.title = "My New Meteor App"
  $("<meta>", { name: "description", content: "Page description for My New Meteor App" }).appendTo "head"

```
