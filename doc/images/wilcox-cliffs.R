source("~/Documents/thesis/doc/images/shared.R", chdir=T)

table <- function(d) {
  samples <- c("generate", "bmi", "time", "imdb")
  wc <- sapply(samples, function (x) {
    column <- paste("sample_",x,"_t_correct", sep="")
    dc <- subset(d, !is.na(d[[column]]))

    w <- wilcox.test(dc[[column]]~(dc$mode=="console"))

    delta <- cliffs.d(
      subset(dc, mode=="console")[,column],
      subset(dc, mode=="rxfiddle")[,column]
    )

    # Result row
    c(
      "n1"=length(subset(dc, mode=="console")[,column]),
      "n2"=length(subset(dc, mode=="rxfiddle")[,column]),
      "W"=w$statistic[["W"]],
      "p"=w$"p.value",
      "Cd"=delta
     #"cox"=w
    )
  })
  wc
}

#### data: all ####

t(table(d)) # output stored in wilcoxonPerTask.tex

#### data: filtering for experience,  2 is 'beginner'-level ####

median(d$exp_rx,na.rm=TRUE)
ggplot2.histogram(d$exp_rx)
df <- subset(d, (exp_rx) > 2)
t(table(df)) # output stored in wilcoxonPerTaskRx.tex

timePerTask(subset(d, exp_rx > 2)) # store in timePerTaskRx.pdf
