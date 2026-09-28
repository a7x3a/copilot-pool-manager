import pc from 'picocolors';
import { healthChecker } from '../../core/health-checker';
import { DoctorCheckItem } from '../../types';

function renderCheckList(items: DoctorCheckItem[]): void {
  const maxLen = Math.max(...items.map((i) => i.name.length), 20) + 2;

  for (const item of items) {
    const pad = ' '.repeat(Math.max(0, maxLen - item.name.length));
    let icon = pc.green('✔');
    let msgColor = pc.dim;

    if (item.status === 'warn') {
      icon = pc.yellow('⚠');
      msgColor = pc.yellow;
    } else if (item.status === 'fail') {
      icon = pc.red('✖');
      msgColor = pc.red;
    }

    console.log(`  ${pc.bold(item.name)}${pad}${icon}  ${msgColor(item.message)}`);
  }
}

export async function doctorCommand(): Promise<void> {
  console.log('\n  ' + pc.cyan(pc.bold('🩺  CPM SYSTEM DIAGNOSTIC (DOCTOR)')));
  console.log('  ' + pc.dim('────────────────────────────────────────────────────────────') + '\n');

  const result = await healthChecker.runDoctor();

  console.log('  ' + pc.bold('💻 Core Environment'));
  console.log('  ' + pc.dim('────────────────────────────────────────'));
  renderCheckList(result.system);
  console.log('');

  console.log('  ' + pc.bold('👥 Account Pool Health'));
  console.log('  ' + pc.dim('────────────────────────────────────────'));
  renderCheckList(result.accounts);
  console.log('');

  console.log('  ' + pc.bold('📁 Configured Projects'));
  console.log('  ' + pc.dim('────────────────────────────────────────'));
  renderCheckList(result.projects);
  console.log('');
}
