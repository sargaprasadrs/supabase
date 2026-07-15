import { useFlag } from 'common'
import { ExternalLink, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui'
import { Input } from 'ui-patterns/DataInputs/Input'

import { AccessTokenList } from '@/components/interfaces/Account/AccessTokens/AccessTokenList'
import { MigrationAdmonition } from '@/components/interfaces/Account/AccessTokens/MigrationAdmonition'
import { NewScopedTokenSheet } from '@/components/interfaces/Account/AccessTokens/Scoped/NewScopedTokenSheet'
import { AccessTokensLayout } from '@/components/layouts/AccessTokens/AccessTokensLayout'
import AccountLayout from '@/components/layouts/AccountLayout/AccountLayout'
import { AppLayout } from '@/components/layouts/AppLayout/AppLayout'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { DOCS_URL } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

const UserAccessTokens: NextPageWithLayout = () => {
  const scopedTokensEnabled = useFlag('scopedPAT')
  const [searchString, setSearchString] = useState('')

  return (
    <AccessTokensLayout>
      <div className="space-y-4">
        {scopedTokensEnabled && <MigrationAdmonition />}
        <div className="flex items-center justify-between gap-x-2 mb-3">
          <Input
            size="tiny"
            autoComplete="off"
            icon={<Search size={12} />}
            value={searchString}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchString(e.target.value)}
            name="search"
            id="search"
            placeholder="Filter tokens"
          />
          <div className="flex items-center gap-x-2">
            <Button asChild variant="default" icon={<ExternalLink />}>
              <a href={`${DOCS_URL}/reference/api/introduction`} target="_blank" rel="noreferrer">
                API Docs
              </a>
            </Button>
            <Button asChild variant="default" icon={<ExternalLink />}>
              <a href={`${DOCS_URL}/reference/cli/start`} target="_blank" rel="noreferrer">
                CLI docs
              </a>
            </Button>
            <NewScopedTokenSheet />
          </div>
        </div>
        <AccessTokenList searchString={searchString} />
      </div>
    </AccessTokensLayout>
  )
}

UserAccessTokens.getLayout = (page) => (
  <AppLayout>
    <DefaultLayout headerTitle="Account">
      <AccountLayout title="Access Tokens">{page}</AccountLayout>
    </DefaultLayout>
  </AppLayout>
)

export default UserAccessTokens
