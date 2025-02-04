import chalk from 'chalk';
import cliBoxes from 'cli-boxes';

export function displaySelectedOptions(infrastructure: Record<string, string | string[]>) {
  const box = cliBoxes.single;
  const formattedOptions = Object.entries(infrastructure)
    .map(([key, value]) => {
      const displayValue = Array.isArray(value) ? value.join(', ') : value;
      return `${key.replace(/_/g, ' ')}: ${chalk.bold(displayValue)}`;
    })
    .join('\n');

  const boxContent = `
${box.topLeft}${box.top.repeat(30)}${box.topRight}
${box.left} Selected Options ${box.right}
${box.left}${box.top.repeat(30)}${box.right}
${formattedOptions.split('\n').map(line => `${box.left} ${line.padEnd(28)} ${box.right}`).join('\n')}
${box.bottomLeft}${box.bottom.repeat(30)}${box.bottomRight}
  `;

} 