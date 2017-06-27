source("~/Documents/thesis/doc/images/shared.R", chdir=T)

timePerTask <- function(d) {
  # Concat all tasks
  nextF <- NULL
  sequential <- NULL
  samples <- c("generate", "bmi", "time", "imdb")
  for (i in 1:length(samples)) {
    name <- paste("sample_",samples[i],"_t_correct", sep="")
    nextF <- data.frame(task=paste("T",i, sep=""),t_correct=unname(d[name]/1000), mode=d$mode, type=d$type, completed=d$sum_t_correct, stringsAsFactors=FALSE)
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

# All results

pdf("~/Documents/thesis/doc/images/timePerTask.pdf", width=6, height=3)
timePerTask(d)
dev.off()

# Various splits

pdf("~/Documents/thesis/doc/images/timePerTaskSplit.pdf", width=15, height=20)
grid_arrange_shared_legend(
  timePerTask(subset(d, years_rp <= 1)) + ggtitle(paste("years exp rp <= 1", sep="")),
  timePerTask(subset(d, years_rp > 1)) + ggtitle(paste("years exp rp > 1", sep="")),
  timePerTask(subset(d, exp_rx <= 2)) + ggtitle(paste("exp rx <= 'beginner'", sep="")),
  timePerTask(subset(d, exp_rx > 2)) + ggtitle(paste("exp rx > 'beginner'", sep="")),
  timePerTask(subset(d, type == "controlled")) + ggtitle(paste("type = controlled", sep="")),
  timePerTask(subset(d, type == "online")) + ggtitle(paste("type = online", sep="")),
  ncol=2, nrow=3)
dev.off()

# Split for Rx

pdf("~/Documents/thesis/doc/images/timePerTaskRx.pdf", width=6, height=3)
timePerTask(subset(d, exp_rx > 2))
dev.off()


