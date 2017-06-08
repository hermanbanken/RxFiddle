# install easyggplot2
install.packages("devtools")
library(devtools)
install_github("easyGgplot2", "kassambara")
install.packages("stringr")

# setup
require(ggplot2)
require(foreign)
library(easyGgplot2)
library(stringr)
require(likert)
library(plyr)

# Load
d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

# Concat all tasks
nextF <- NULL
sequential <- NULL
samples <- c("generate", "bmi", "time", "imdb")
for (i in 1:length(samples)) {
  name <- paste("sample_",samples[i],"_state", sep="")
  nextF <- data.frame(task=paste("T",i, sep=""),state=factor(d[,name]), mode=d$mode, type=d$type, stringsAsFactors=FALSE)
  nextF$state = factor(nextF$state, c("correct", "nf", "pass"))
  nextF$state = revalue(nextF$state, c("pass"="don't know", "nf"="incorrect/not finished"))
  # Possible filters
  # TODO remove 600 (10 minutes) clipping as soon as pause/unpause events are accounted for
  #nextF <- subset(nextF, t_correct<600 & !is.na(completed))
  #nextF <- subset(nextF, t_correct<600 & str_detect(type, "controlled"))
  
  sequential <- rbind(sequential, nextF)
}

lout <- likert(sequential[,"state",drop=FALSE],grouping=paste(sequential[,c("task")], sequential[,c("type")], sequential[,c("mode")]))
plot(lout,
     include.histogram=TRUE, 
    # group.order=c('T1', 'T2', 'T3', 'T4'), 
     centered=FALSE) 
#+ guides(fill = guide_legend(title = "Translated")
#       )
+ ggtitle("Translated")



# Plot
plot <- ggplot2.boxplot(data=sequential, yName="t_correct", xName="task", main="t_correct", xlab="Task",ylab="Time", groupName="mode", outline=FALSE)
pdf("~/Documents/thesis/doc/images/resultPerTask.pdf", width=12, height=6)
plot
dev.off()

