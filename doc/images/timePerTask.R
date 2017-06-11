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

ggplot(d, aes(x = type, y = years_rp)) + geom_boxplot()
median(d$years_pr, na.rm=TRUE)
median(d$years_rp, na.rm=TRUE)
median(d$exp_pr, na.rm=TRUE)
median(d$exp_rp, na.rm=TRUE)
ggplot(d, aes(x = d$years_pr, y = d$sample_time_state, color = d$mode)) + geom_point()

timePerTask <- function(d) {
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
  plot <- ggplot2.boxplot(data=sequential,
                  yName="t_correct",
                  xName="task", 
                  main="t_correct",
                  groupName="mode",
                  outline=FALSE
                  ) + ylab("Time (s)") + xlab("Task")
  plot
}

pdf("~/Documents/thesis/doc/images/timePerTask.pdf", width=6, height=3)
timePerTask(d)
dev.off()

# Plot counts inside bars
#n_fun <- function(x){
#  return(data.frame(y = median(x), label = paste0(length(x))))
#}
#+ stat_summary(fun.data = n_fun, geom = "text"),

pdf("~/Documents/thesis/doc/images/timePerTaskSplit.pdf", width=15, height=20)

grid_arrange_shared_legend(
  timePerTask(subset(d, years_rp <= 1)) + ggtitle(paste("years exp rp <= 1 (n = ", nrow(subset(d, years_rp <= 1)), ")", sep="")),
  timePerTask(subset(d, years_rp > 1)) + ggtitle(paste("years exp rp > 1 (n = ", nrow(subset(d, years_rp > 1)), ")", sep="")),
  timePerTask(subset(d, exp_rp <= 2)) + ggtitle(paste("exp rp < 'beginner' (n = ", nrow(subset(d, exp_rp <= 2)), ")", sep="")),
  timePerTask(subset(d, exp_rp > 2)) + ggtitle(paste("exp rp >= 'beginner' (n = ", nrow(subset(d, exp_rp > 2)), ")", sep="")),
  timePerTask(subset(d, type == "controlled")) + ggtitle(paste("type = controlled (n = ", nrow(subset(d, type == "controlled")), ")", sep="")),
  timePerTask(subset(d, type == "online")) + ggtitle(paste("type = online (n = ", nrow(subset(d, type == "online")), ")", sep="")),
  ncol=2, nrow=3)

plot
dev.off()

