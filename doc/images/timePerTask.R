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

# Load
d = read.arff("~/Dropbox/Afstuderen/interviews/analyze experiment/current.arff")

# Concat all tasks
nextF <- NULL
sequential <- NULL
samples <- c("generate", "bmi", "time", "imdb")
for (i in 1:length(samples)) {
  name <- paste("sample_",samples[i],"_t_correct", sep="")
  nextF <- data.frame(task=paste("T",i, sep=""),t_correct=unname(d[name]/1000), mode=d$mode, type=d$type, completed=d$sum_t_correct, stringsAsFactors=FALSE)
  
  # Possible filters
  # TODO remove 600 (10 minutes) clipping as soon as pause/unpause events are accounted for
  nextF <- subset(nextF, t_correct<600)
  #nextF <- subset(nextF, t_correct<600 & !is.na(completed))
  #nextF <- subset(nextF, t_correct<600 & str_detect(type, "controlled"))
  
  sequential <- rbind(sequential, nextF)
}

# Plot
#plot <- 
ggplot2.boxplot(data=sequential,
                yName="t_correct",
                xName="task", 
                main="t_correct",
                groupName="mode",
                outline=FALSE
                ) + ylab("Time") + xlab("Task")
pdf("~/Documents/thesis/doc/images/timePerTask.pdf", width=6, height=3) 
plot
dev.off()

