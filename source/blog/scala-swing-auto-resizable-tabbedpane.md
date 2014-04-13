---
author: Tymon Tobolski
date: 2010-03-25
title: Scala swing auto-resizable TabbedPane
tags: scala, swing
source: tumblr
source_url: http://tumblr.teamon.eu/post/472511779/scala-swing-auto-resizable-tabbedpane
---

```scala
import scala.swing._
import scala.swing.event.SelectionChanged

object Test extends SimpleSwingApplication {

  lazy val tabbedPane = new TabbedPane {
    pages += new TabbedPane.Page("One", new BoxPanel(Orientation.Vertical) {
      contents += new Button { text = "Button 1" }
      contents += new Button { text = "Button 2" }
    })
    pages += new TabbedPane.Page("Two", new BoxPanel(Orientation.Horizontal) {
      contents += new Button { text = "Button 1" }
      contents += new Button { text = "Button 2" }
    })
    pages += new TabbedPane.Page("Three", new BoxPanel(Orientation.Vertical) {
      contents += new Slider { orientation = Orientation.Vertical }
      contents += new Slider { orientation = Orientation.Vertical }
      contents += new TextArea
    })

    val originalPreferredSize = preferredSize
    lazy val maxPreferredWidth  = pages.map { _.self.preferredSize.width  }.max
    lazy val maxPreferredHeight = pages.map { _.self.preferredSize.height }.max

    def updatePreferredSize {
      val size = selection.page.self.preferredSize
      preferredSize = (
        originalPreferredSize.width - (maxPreferredWidth - size.width),
        originalPreferredSize.height - (maxPreferredHeight - size.height)
      )
    }
  }

  def top = new MainFrame {
    title = "Test"

    contents = tabbedPane

    listenTo(tabbedPane.selection)

    reactions += {
      case SelectionChanged(`tabbedPane`) =>
        tabbedPane.updatePreferredSize
        pack
      }
    }
}
```
