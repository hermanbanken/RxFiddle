install.packages("devtools")
library(devtools)
install_github("gousiosg/cliffs.d")
library(cliffsd)
d = read.arff("/Users/hbanken/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

table <- function(d) {
  samples <- c("generate", "bmi", "time", "imdb")
  wc <- sapply(samples, function (x) {
    column <- paste("sample_",x,"_t_correct", sep="")
    dc <- subset(d, !is.na(d[[column]]))
    print(paste(x, ": n = ", nrow(dc)))
    print(wilcox.test(dc[[column]]~(dc$mode=="console")))
    delta <- cliffs.d(
      subset(dc, mode=="console")[,column],
      subset(dc, mode=="rxfiddle")[,column]
    )
    print(paste("N_console", length(subset(dc, mode=="console")[,column])))
    print(paste("N_rxfiddle", length(subset(dc, mode=="rxfiddle")[,column])))
    print(paste("Cliffs delta: ", delta))
  })
}

table(d)

# output stored in wilcoxonPerTask.tex

# filtering for experience

median(d$exp_rx,na.rm=TRUE)
ggplot2.histogram(d$exp_rx)
df <- subset(d, (exp_rx) > 2)
table(df)
timePerTask(subset(d, exp_rx > 2))

