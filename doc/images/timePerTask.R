# install easyggplot2
install.packages("devtools")
library(devtools)
install_github("easyGgplot2", "kassambara")

# setup
require(ggplot2)
require(foreign)
library(easyGgplot2)

# Load
d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

# Concat all tasks
nextF <- NULL
sequential <- NULL
samples <- c("generate", "bmi", "time", "imdb")
for (i in 1:length(samples)) {
  name <- paste("sample_",samples[i],"_t_correct", sep="")
  nextF <- data.frame(task=paste("T",i, sep=""),t_correct=unname(d[name]/1000), mode=d$mode, stringsAsFactors=FALSE)
  # TODO remove 600 (10 minutes) clipping as soon as pause/unpause events are accounted for
  nextF <- subset(nextF, t_correct<600)
  sequential <- rbind(sequential, nextF)
}

# Plot
plot <- ggplot2.boxplot(data=sequential, yName="t_correct", xName="task", main="t_correct", xlab="Task",ylab="Time", groupName="mode", outline=FALSE)
pdf("~/Documents/thesis/doc/images/timePerTask.pdf", width=6, height=3)
plot
dev.off()
