import pc from 'picocolors';
import { healthChecker } from '../../core/health-checker';
import { DoctorCheckItem } from '../../types';

function renderCheckList(items: DoctorCheckItem[]): void {
  const maxLen = Math.max(...items.map((i) => i.name.length), 18) + 2;

  for (const item of items) {
    const pad = ' '.repeat(Math.max(0, maxLen - item.name.length));
    let icon = pc.green('✓');
    let msgColor = pc.dim;

    if (item.status === 'warn') {
      icon = pc.yellow('!');
      msgColor = pc.yellow;
    } else if (item.status === 'fail') {
      icon = pc.red('✗');
      msgColor = pc.red;
    }

    console.log(` ${item.name}${pad}${icon}  ${msgColor(item.message)}`);
  }
}

export async function doctorCommand(): Promise<void> {
  console.log('\n' + pc.bold('CPM Doctor'));
  console.log('─'.repeat(40) + '\n');

  const result = await healthChecker.runDoctor();

  renderCheckList(result.system);
  console.log('');

  console.log(pc.bold('Accounts'));
  console.log('─'.repeat(40));
  renderCheckList(result.accounts);
  console.log('');

  console.log(pc.bold('Projects'));
  console.log('─'.repeat(40));
  renderCheckList(result.projects);
  console.log('');
}
