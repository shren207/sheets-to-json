import chalk from 'chalk';

export default {
  info: (...args: any[]) => console.log(chalk.blue(...args)),
  warn: (...args: any[]) => console.log(chalk.yellow(...args)),
  error: (...args: any[]) => console.log(chalk.red(...args)),
  success: (...args: any[]) => console.log(chalk.green(...args)),
};
