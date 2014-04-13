---
author: Tymon Tobolski
date: 2010-02-17
title: "Lift: Form fields attributes"
tags: scala, lift
source: tumblr
source_url: http://tumblr.teamon.eu/post/395033779/lift-form-fields-attributes
---


```scala
class Sample {
  def sample(xhtml: NodeSeq): NodeSeq = {
    bind("f", xhtml,
      "one" -> SHtml.text("", e => e),
      "two" -> SHtml.text("", e => e),
      "three" -%> SHtml.text("", e => e),
      "four" -> SHtml.text("", e => e) % ("id" -> "four_id"),
      "five" -%> SHtml.text("", e => e) % ("id" -> "five_id") % ("maxlength" -> "20")
    )
  }
}
```

### +

```html
<lift:Sample.sample form="POST">
  <f:one/>
  <f:two id="two_id" />
  <f:three id="three_id" />
  <f:four/>
  <f:five id="other_id"/>
</lift:Sample.sample>
```

### =
```html
<form action="/sample" method="post">
    <input name="F381921387278KLY" value="" type="text" />
    <input name="F381921387279KPG" value="" type="text" />
    <input name="F381921387280FIB" value="" type="text" id="three_id" />
    <input name="F381921387281GUG" value="" type="text" id="four_id" />
    <input name="F381921387282LYP" value="" type="text" id="other_id" maxlength="20" />
</form>
```

- **one** - The most basic tag, there are no attributes in code nor markup.
- **two** - Same as above but with id attribute set in markup. As you can see in generated html this attribute is lost.
- **three** - `-%>` syntax preserves markup attributes.
- **four** - Other way of setting html attributes.
- **five** - When setting attributes in both code and markup the second one has higher priority.
